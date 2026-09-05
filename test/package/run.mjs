import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  mkdtempSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";
import { chromium } from "@playwright/test";
import { build } from "vite";
const root = fileURLToPath(new URL("../..", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "redline-consumer-"));
const env = { ...process.env, npm_config_cache: join(dir, "cache") };
const run = (command, args, cwd = dir) =>
  execFileSync(command, args, {
    cwd,
    env,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
let browser, server;
try {
  mkdirSync(join(root, "artifacts"), { recursive: true });
  const [pack] = JSON.parse(
    run(
      "npm",
      ["pack", "--json", "--pack-destination", join(root, "artifacts")],
      root,
    ),
  );
  const tarball = join(root, "artifacts", pack.filename);
  const files = pack.files.map((f) => f.path);
  for (const required of [
    "LICENSE",
    "README.md",
    "CONTRACT.md",
    "COMPATIBILITY.md",
    "THIRD-PARTY-NOTICES.md",
    "dist/index.js",
    "dist/index.d.ts",
    "examples/browser-host.mjs",
  ])
    assert(files.includes(required), required);
  assert(
    files.every((f) =>
      /^(dist\/|examples\/|package.json$|README.md$|LICENSE$|CONTRACT.md$|COMPATIBILITY.md$|CHANGELOG.md$|THIRD-PARTY-NOTICES.md$)/.test(
        f,
      ),
    ),
    files.join("\n"),
  );
  writeFileSync(
    join(dir, "package.json"),
    JSON.stringify({ private: true, type: "module" }),
  );
  run("npm", [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    tarball,
  ]);
  const installed = JSON.parse(
    readFileSync(join(dir, "node_modules/redline-engine/package.json")),
  );
  assert.equal(installed.version, "0.1.0");
  for (const file of files.filter((f) => f.endsWith(".js.map"))) {
    const map = JSON.parse(
      readFileSync(join(dir, "node_modules/redline-engine", file)),
    );
    assert.equal(map.sources.length, map.sourcesContent.length);
    assert(
      map.sourcesContent.every((s) => typeof s === "string" && s.length > 0),
    );
  }
  assert(!files.some((f) => f.endsWith(".d.ts.map")));
  assert.notEqual(installed.private, true);
  writeFileSync(
    join(dir, "consumer.ts"),
    `import {compareBodies,renderMerged,project,DEFAULT_LIMITS,MODEL_VERSION} from 'redline-engine';
import type {CompareBodiesInput,ComparisonResult,Comparison,Limits,Operation,Side,Diagnostic,Timings} from 'redline-engine';
const input:CompareBodiesInput={beforeHtml:'<p>old</p>',afterHtml:'<p>new</p>'};
const result:ComparisonResult=compareBodies(input);
const limits:Limits=DEFAULT_LIMITS; const version:1=MODEL_VERSION; const side:Side='before';
if(result.outcome==='success'){const c:Comparison=result.comparison; const op:Operation|undefined=c.operations[0]; const timing:Timings=c.timings; const ds:readonly Diagnostic[]=c.diagnostics; const html:string=renderMerged(c).html; const original:string=project(c,side);}
// @ts-expect-error invalid public side
project({} as Comparison,'wrong');
// @ts-expect-error missing required afterHtml
compareBodies({beforeHtml:'x'});
`,
  );
  for (const [module, moduleResolution] of [
    ["NodeNext", "NodeNext"],
    ["ESNext", "Bundler"],
  ]) {
    writeFileSync(
      join(dir, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          lib: ["ES2022"],
          module,
          moduleResolution,
          strict: true,
          noEmit: true,
          skipLibCheck: false,
        },
        include: ["consumer.ts"],
      }),
    );
    run(process.execPath, [
      join(root, "node_modules/typescript/bin/tsc"),
      "--project",
      "tsconfig.json",
    ]);
  }
  const smoke = `import assert from 'node:assert/strict'; import {compareBodies,project,renderMerged} from 'redline-engine';
const beforeHtml='<p>the <b>quick</b> fox</p>',afterHtml='<p>the quick <b>brown</b> fox</p>';
const r=compareBodies({beforeHtml,afterHtml,dataPrefix:'review',className:'change'});
assert.equal(r.outcome,'success');assert.equal(project(r.comparison,'before'),beforeHtml);assert.equal(project(r.comparison,'after'),afterHtml);
assert.match(renderMerged(r.comparison).html,/data-review-unwrap/);
assert.equal(compareBodies({beforeHtml:'x',afterHtml:'y',limits:{maxInputUnits:1}}).outcome,'limit');
assert.equal(compareBodies({beforeHtml:'x',afterHtml:'y',dataPrefix:'bad prefix'}).outcome,'unsupported');
`;
  writeFileSync(join(dir, "smoke.mjs"), smoke);
  run(process.execPath, ["smoke.mjs"]);
  writeFileSync(
    join(dir, "node-worker.mjs"),
    `import {parentPort} from 'node:worker_threads';${smoke}parentPort.postMessage('passed');`,
  );
  writeFileSync(
    join(dir, "node-host.mjs"),
    `import {Worker} from 'node:worker_threads';const w=new Worker(new URL('./node-worker.mjs',import.meta.url));const t=setTimeout(()=>{w.terminate();process.exitCode=1;},15000);w.on('message',()=>{clearTimeout(t);w.terminate();});w.on('error',e=>{clearTimeout(t);throw e;});`,
  );
  run(process.execPath, ["node-host.mjs"]);
  const node22Args = ["exec", "--yes", "--package=node@22", "--", "node"];
  const node22 = run("npm", [...node22Args, "--version"]).trim();
  run("npm", [...node22Args, "smoke.mjs"]);
  run("npm", [...node22Args, "node-host.mjs"]);

  for (const file of ["basic.mjs", "browser-host.mjs", "browser-worker.mjs"])
    copyFileSync(
      join(dir, "node_modules/redline-engine/examples", file),
      join(dir, file),
    );
  run(process.execPath, ["basic.mjs"]);
  writeFileSync(
    join(dir, "index.html"),
    `<!doctype html><script type="module">import {compareInWorker} from './browser-host.mjs';window.compareInWorker=compareInWorker;</script>`,
  );
  await build({
    configFile: false,
    root: dir,
    logLevel: "error",
    build: { outDir: join(dir, "web-dist") },
  });
  server = createServer((req, res) => {
    try {
      const path = join(
        dir,
        "web-dist",
        req.url === "/" ? "index.html" : req.url,
      );
      res.setHeader(
        "Content-Type",
        path.endsWith(".js") ? "text/javascript" : "text/html",
      );
      res.end(readFileSync(path));
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.waitForFunction(() => !!window.compareInWorker);
  const result = await page.evaluate(async () => {
    const r = await window.compareInWorker({
      beforeHtml: "<p>the <b>quick</b> fox</p>",
      afterHtml: "<p>the quick <b>brown</b> fox</p>",
    });
    if (r.outcome !== "success") throw Error(r.outcome);
    const project = (side) => {
      const b = document.createElement("body");
      b.innerHTML = r.html;
      for (const n of [
        ...b.querySelectorAll("[data-diff-node],[data-diff-unwrap]"),
      ].reverse()) {
        if (
          n.getAttribute("data-diff-node") ===
          (side === "before" ? "insert" : "delete")
        )
          n.remove();
        else if (
          n.hasAttribute("data-diff-wrapper") ||
          n.getAttribute("data-diff-unwrap") === side
        )
          n.replaceWith(...n.childNodes);
        else
          for (const a of [...n.attributes])
            if (a.name.startsWith("data-diff-")) n.removeAttribute(a.name);
      }
      return b.innerHTML;
    };
    const controller = new AbortController();
    controller.abort("cancelled");
    let aborted = false;
    try {
      await window.compareInWorker(
        { beforeHtml: "x", afterHtml: "y" },
        { signal: controller.signal },
      );
    } catch (e) {
      aborted = e === "cancelled";
    }
    return {
      before: project("before"),
      after: project("after"),
      aborted,
      html: r.html,
      keys: Object.keys(r).sort(),
    };
  });
  assert.equal(result.before, "<p>the <b>quick</b> fox</p>");
  assert.equal(result.after, "<p>the quick <b>brown</b> fox</p>");
  assert(result.aborted);
  assert.match(result.html, />brown<\/ins>/);
  assert.deepEqual(result.keys, ["diagnostics", "html", "outcome", "timings"]);
  const report = {
    date: new Date().toISOString(),
    version: installed.version,
    node: process.version,
    minimumMajorRuntime: node22,
    chromium: browser.version(),
    typescript: JSON.parse(
      readFileSync(join(root, "node_modules/typescript/package.json")),
    ).version,
    tarball: pack.filename,
    integrity: pack.integrity,
    sha256: createHash("sha256").update(readFileSync(tarball)).digest("hex"),
    size: pack.size,
    unpackedSize: pack.unpackedSize,
    files,
    dependencies: JSON.parse(run("npm", ["ls", "--omit=dev", "--json"])),
    checks: [
      "allowlisted package contents and license",
      "clean npm install without lifecycle scripts",
      "strict NodeNext and Bundler TypeScript, no DOM lib, skipLibCheck=false",
      "Node ESM public API and formatting-shell projections",
      "Node worker consumer on current and Node 22 runtimes",
      "shipped basic example",
      "Vite production build of shipped browser examples",
      "Chromium production worker, independent projections, precise brown highlight, cancellation and minimal response",
    ],
  };
  writeFileSync(
    join(root, "release/package-check.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(
    JSON.stringify(
      { version: installed.version, tarball, checks: report.checks },
      null,
      2,
    ),
  );
} finally {
  await browser?.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  rmSync(dir, { recursive: true, force: true });
}
