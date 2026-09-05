/** Direct comparison against the sibling's existing large documents and current engine/shortcut. */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { cpus, platform, arch } from "node:os";
import { parse, serialize } from "parse5";
const sibling = resolve(process.env.PLUGIN_ROOT ?? "../redline");
const cutoffMs = 15000;
if (process.argv.includes("--child")) {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  const { engine, before, after } = JSON.parse(input);
  const { compareBodies } = await import("../dist/index.js");
  const { default: legacy } = await import(
    pathToFileURL(resolve(sibling, "frontend/src/vendor/htmldiff.js")).href
  );
  let aligned;
  if (engine === "plugin-shortcut") {
    const { Window } = await import("happy-dom");
    const window = new Window();
    const { transpileModule, ScriptTarget } = await import("typescript");
    const source = readFileSync(
      resolve(sibling, "frontend/src/diff.ts"),
      "utf8",
    );
    const start = source.indexOf("const ALIGNED_CHUNK_THRESHOLD =");
    const fn = source.indexOf("function alignedBodyChunks(", start);
    const end = source.indexOf("\n}\n", fn) + 3;
    if (start < 0 || fn < 0 || end < 3)
      throw Error("Sibling shortcut source changed");
    const js = transpileModule(source.slice(start, end), {
      compilerOptions: { target: ScriptTarget.ES2022 },
    }).outputText;
    const shortcut = new Function("Node", js + "; return alignedBodyChunks;")(
      window.Node,
    );
    aligned = (a, b) => {
      const left = window.document.createElement("body"),
        right = window.document.createElement("body");
      left.innerHTML = a;
      right.innerHTML = b;
      return shortcut(left, right);
    };
  }
  const start = performance.now();
  let result;
  if (engine === "structural") {
    const r = compareBodies({ beforeHtml: before, afterHtml: after });
    result =
      r.outcome === "success"
        ? {
            outcome: r.outcome,
            timings: r.comparison.timings,
            outputUnits: r.comparison.mergedHtml.length,
            coarseReplacements: r.comparison.diagnostics.filter(
              (d) => d.code === "coarse-replacement",
            ).length,
          }
        : { ...r };
  } else {
    const chunks = aligned?.(before, after);
    const html = (chunks ?? [{ before, after }])
      .map((c) =>
        c.before === c.after
          ? c.after
          : legacy(
              c.before,
              c.after,
              "redline",
              null,
              "iframe,object,math,svg,script,video,style",
            ),
      )
      .join("");
    result = {
      outcome: "rendered",
      shortcutUsed: !!chunks,
      chunks: chunks?.length ?? 1,
      outputUnits: html.length,
    };
  }
  process.stdout.write(
    JSON.stringify({
      elapsedMs: performance.now() - start,
      maxRssKiB: process.resourceUsage().maxRSS,
      ...result,
    }),
  );
} else {
  const originals = Object.fromEntries(
    ["before", "after"].map((side) => [
      side,
      readFileSync(
        resolve(sibling, `testdata/large/generated/${side}.html`),
        "utf8",
      ),
    ]),
  );
  const body = (s) => {
    const stack = [parse(s)];
    while (stack.length) {
      const n = stack.pop();
      if (n.tagName === "body") return serialize(n);
      stack.push(...(n.childNodes ?? []));
    }
    throw Error("Body missing");
  };
  const before = body(originals.before),
    after = body(originals.after);
  const fixtures = [
    { name: "existing-6000-paragraph-pair", before, after },
    {
      name: "same-pair-with-wrapper",
      before: `<section>${before}</section>`,
      after: `<section>${after}</section>`,
    },
    {
      name: "same-pair-with-start-insertion",
      before,
      after: `<p>Inserted paragraph.</p>${after}`,
    },
  ];
  const run = (engine, fixture) =>
    new Promise((resolveResult) => {
      const child = spawn(
        process.execPath,
        [new URL("./sibling.mjs", import.meta.url).pathname, "--child"],
        { stdio: ["pipe", "pipe", "pipe"] },
      );
      let output = "",
        error = "",
        timeout = false;
      const timer = setTimeout(() => {
        timeout = true;
        child.kill("SIGKILL");
      }, cutoffMs);
      child.stdout.on("data", (s) => (output += s));
      child.stderr.on("data", (s) => (error += s));
      child.on("error", (e) => {
        clearTimeout(timer);
        resolveResult({ outcome: "error", error: String(e) });
      });
      child.on("close", (code) => {
        clearTimeout(timer);
        resolveResult(
          timeout
            ? { outcome: "timeout", cutoffMs }
            : code === 0
              ? JSON.parse(output)
              : { outcome: "error", error },
        );
      });
      child.stdin.on("error", () => {});
      child.stdin.end(JSON.stringify({ engine, ...fixture }));
    });
  const rows = [];
  for (const fixture of fixtures)
    for (const engine of ["structural", "legacy-raw", "plugin-shortcut"]) {
      const runs = [];
      for (let i = 0; i < (engine === "legacy-raw" ? 1 : 3); i++) {
        const result = await run(engine, fixture);
        runs.push(result);
        console.log(fixture.name, engine, JSON.stringify(result));
        if (result.outcome === "timeout" || result.outcome === "error") break;
      }
      rows.push({
        fixture: fixture.name,
        engine,
        combinedUnits: fixture.before.length + fixture.after.length,
        runs,
      });
    }
  const report = {
    date: new Date().toISOString(),
    hardware: { cpu: cpus()[0].model, platform: platform(), arch: arch() },
    node: process.version,
    sourceFiles: Object.fromEntries(
      Object.entries(originals).map(([side, s]) => [
        side,
        {
          path: `testdata/large/generated/${side}.html`,
          units: s.length,
          utf8Bytes: Buffer.byteLength(s),
          sha256: createHash("sha256").update(s).digest("hex"),
        },
      ]),
    ),
    legacySha256: createHash("sha256")
      .update(readFileSync(resolve(sibling, "frontend/src/vendor/htmldiff.js")))
      .digest("hex"),
    method:
      "Existing files read directly from sibling. Body extraction outside timing. Fresh processes, 15s cutoff includes startup; elapsed excludes module loading. Three completed samples except raw legacy (one); stop repeats on timeout. Plugin shortcut uses actual sibling function extracted/transpiled unchanged, with happy-dom parsing; not JCEF or full viewer timing. Structural includes both-side validation; legacy does not.",
    rows,
  };
  writeFileSync(
    new URL("./sibling-results-2026-09-05.json", import.meta.url),
    JSON.stringify(report, null, 2) + "\n",
  );
}
