import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";
import { cpus, platform, arch, totalmem } from "node:os";
import { parse, serialize, type DefaultTreeAdapterMap } from "parse5";
import { cases, structural, sparse } from "../test/fixtures/cases.ts";
const directory = new URL("./results/", import.meta.url);
mkdirSync(directory, { recursive: true });
function body(s: string) {
  const doc = parse(s);
  const stack = [...doc.childNodes];
  while (stack.length) {
    const n = stack.pop()!;
    if ("tagName" in n && n.tagName === "body") return serialize(n);
    if ("childNodes" in n) stack.push(...n.childNodes);
  }
  return s;
}
const corpus = ["collection-guide", "transaction-guide", "welcome-pack"].map(
  (name) => ({
    name: `legacy-${name}`,
    before: body(
      readFileSync(
        new URL(
          `../test/fixtures/legacy/mock/before/${name}.html`,
          import.meta.url,
        ),
        "utf8",
      ),
    ),
    after: body(
      readFileSync(
        new URL(
          `../test/fixtures/legacy/mock/after/${name}.html`,
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  }),
);
const fixtures = [
  {
    name: "giant-punctuation",
    before: `<p>${".".repeat(950000)}</p>`,
    after: `<p>${",".repeat(950000)}</p>`,
  },
  {
    name: "deep-nesting",
    before: "<div>".repeat(300) + "x" + "</div>".repeat(300),
    after: "<p>x</p>",
  },
  { name: "sparse-nested-4000", ...sparse(4000) },
  { name: "sparse-inserted-4000", ...sparse(4000, true) },
  ...cases,
  ...corpus,
  { name: "nested-2000", ...structural(2000) },
  { name: "nested-6000", ...structural(6000) },
  { name: "flat-6000", ...structural(6000, false) },
  {
    name: "repeated-6000",
    before: "<div>" + "<p>same paragraph</p>".repeat(6000) + "</div>",
    after:
      "<div><p>inserted</p>" + "<p>same paragraph</p>".repeat(6000) + "</div>",
  },
  {
    name: "unrelated-3000",
    before: "<p>before</p>".repeat(3000),
    after: "<section>after</section>".repeat(3000),
  },
];
function counts(s: string) {
  let nodes = 0;
  const stack: DefaultTreeAdapterMap["node"][] = [parse(s)];
  while (stack.length) {
    const n = stack.pop()!;
    nodes++;
    if ("childNodes" in n) stack.push(...n.childNodes);
  }
  let lexicalTokens = 0;
  for (const _token of s.matchAll(
    /[\p{L}\p{N}\p{M}]+|\s+|[^\p{L}\p{N}\p{M}\s]/gu,
  ))
    lexicalTokens++;
  return {
    units: s.length,
    utf8Bytes: Buffer.byteLength(s),
    documentNodes: nodes,
    lexicalTokens,
  };
}
async function run(
  engine: string,
  before: string,
  after: string,
): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const child = spawn(
      process.execPath,
      [new URL("./child.mjs", import.meta.url).pathname],
      { stdio: ["pipe", "pipe", "pipe"] },
    );
    let stdout = "",
      stderr = "",
      timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill("SIGKILL");
    }, 2500);
    child.stdout.on("data", (chunk) => (stdout += chunk));
    child.stderr.on("data", (chunk) => (stderr += chunk));
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ error: String(error) });
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve(
        timedOut
          ? { outcome: "timeout", cutoffMs: 2500 }
          : code === 0
            ? JSON.parse(stdout)
            : { error: stderr, code },
      );
    });
    child.stdin.on("error", () => {});
    child.stdin.end(JSON.stringify({ engine, before, after }));
  });
}
const rows = [];
for (const fixture of fixtures.filter(
  (f) => !process.env.BENCH_FILTER || f.name.includes(process.env.BENCH_FILTER),
)) {
  for (const engine of ["structural", "legacy", "jsdiff"]) {
    const runs = [];
    for (
      let repeat = 0;
      repeat <
      (fixture.name.includes("6000") ||
      fixture.name.includes("4000") ||
      fixture.name === "nested-2000"
        ? 3
        : 1);
      repeat++
    )
      runs.push(await run(engine, fixture.before, fixture.after));
    const file = `${fixture.name}-${engine}.json`;
    writeFileSync(new URL(file, directory), JSON.stringify(runs, null, 2));
    const summaries = runs.map(({ result, ...metrics }) => ({
      ...metrics,
      ...(typeof result === "object" && result !== null
        ? {
            outcome: "outcome" in result ? result.outcome : "rendered",
            ...("limit" in result ? { limit: result.limit } : {}),
            ...("comparison" in result
              ? { timings: (result.comparison as { timings: unknown }).timings }
              : {}),
          }
        : {}),
    }));
    rows.push({
      fixture: fixture.name,
      engine,
      before: counts(fixture.before),
      after: counts(fixture.after),
      runs: summaries,
      artifact: file,
    });
    console.log(fixture.name, engine, JSON.stringify(summaries));
  }
}
writeFileSync(
  new URL("summary.json", directory),
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      engineVersion: JSON.parse(
        readFileSync(new URL("../package.json", import.meta.url), "utf8"),
      ).version,
      dependencies: Object.fromEntries(
        ["parse5", "diff", "@playwright/test", "vite"].map((name) => [
          name,
          JSON.parse(
            readFileSync(
              new URL(`../node_modules/${name}/package.json`, import.meta.url),
              "utf8",
            ),
          ).version,
        ]),
      ),
      hardware: {
        cpu: cpus()[0]?.model,
        logicalCpus: cpus().length,
        memoryBytes: totalmem(),
        platform: platform(),
        arch: arch(),
      },
      runtime: process.versions,
      method:
        "Fresh Node process per sample; 2500 ms hard cutoff includes startup. elapsedMs excludes startup. RSS includes Node and imported engines. Three cold samples for anchor cases; one elsewhere. jsdiff is a bounded sequence candidate, not an HTML renderer.",
      rows,
    },
    null,
    2,
  ),
);
