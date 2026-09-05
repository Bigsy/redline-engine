/** Pack and consume through the actual plugin worker in an isolated frontend copy. */
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, basename } from "node:path";
import { execFileSync } from "node:child_process";
import { createServer } from "node:http";
import { chromium } from "@playwright/test";
const root = resolve(new URL("../..", import.meta.url).pathname);
const source = process.env.PLUGIN_ROOT ?? resolve(root, "../redline");
const temp = mkdtempSync(join(tmpdir(), "redline-integration-"));
const frontend = join(temp, "frontend");
cpSync(join(source, "frontend"), frontend, {
  recursive: true,
  filter: (path) =>
    !["node_modules", "dist", "test-results", "playwright-report"].includes(
      basename(path),
    ),
});
execFileSync("pnpm", ["run", "build"], { cwd: root, stdio: "inherit" });
mkdirSync(join(root, "artifacts"), { recursive: true });
execFileSync("pnpm", ["pack", "--pack-destination", join(root, "artifacts")], {
  cwd: root,
  stdio: "inherit",
});
const manifest = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const archive = join(
  root,
  "artifacts",
  `${manifest.name}-${manifest.version}.tgz`,
);
execFileSync("pnpm", ["add", "--offline", archive], {
  cwd: frontend,
  stdio: "inherit",
});
const workerFile = join(frontend, "src/diff.worker.ts");
const original = readFileSync(workerFile, "utf8");
if (!original.includes('import htmldiff from "./vendor/htmldiff";'))
  throw Error("Plugin worker seam changed; update smoke adapter.");
const adapter = `import { compareBodies, renderMerged } from "redline-engine";
function htmldiff(before: string, after: string, ..._legacyOptions: unknown[]): string {
 const result = compareBodies({ beforeHtml: before, afterHtml: after });
 if (result.outcome !== "success") throw new Error(JSON.stringify(result));
 return renderMerged(result.comparison).html;
}`;
writeFileSync(
  workerFile,
  original.replace('import htmldiff from "./vendor/htmldiff";', adapter),
);
execFileSync("pnpm", ["run", "typecheck"], {
  cwd: frontend,
  stdio: "inherit",
  env: { ...process.env, CI: "true" },
});
execFileSync("pnpm", ["run", "build"], { cwd: frontend, stdio: "inherit" });
const web = join(temp, "src/main/resources/web");
const worker = readdirSync(join(web, "assets")).find(
  (f) => f.startsWith("diff.worker-") && f.endsWith(".js"),
);
if (!worker) throw Error("Bundled worker missing");
const server = createServer((req, res) => {
  if (req.url === "/") {
    res.setHeader("Content-Type", "text/html");
    res.end("<!doctype html><title>Worker smoke</title>");
    return;
  }
  if (req.url === `/assets/${worker}`) {
    res.setHeader("Content-Type", "text/javascript");
    res.end(readFileSync(join(web, "assets", worker)));
    return;
  }
  res.statusCode = 404;
  res.end();
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
let browser;
try {
  browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  const result = await page.evaluate(async (workerPath) => {
    const send = (request) =>
      new Promise((resolve, reject) => {
        const worker = new Worker(workerPath, { type: "module" });
        const timer = setTimeout(() => {
          worker.terminate();
          reject(Error("worker deadline"));
        }, 15000);
        worker.onmessage = (e) => {
          clearTimeout(timer);
          worker.terminate();
          resolve(e.data);
        };
        worker.onerror = (e) => {
          clearTimeout(timer);
          worker.terminate();
          reject(Error(e.message));
        };
        worker.postMessage({
          ...request,
          className: "redline",
          atomicTags: "iframe,object,math,svg,script,video,style",
        });
      });
    const whole = await send({
      before: "<section><p>A</p></section>",
      after: "<section><p>New</p><p>A</p></section>",
    });
    const chunks = await send({
      chunks: [
        { before: "<p>A</p>", after: "<p>B</p>" },
        { before: "<p>same</p>", after: "<p>same</p>" },
      ],
    });
    const unsupported = await send({ before: "<!--a-->", after: "<!--b-->" });
    if (
      !whole.html?.includes('data-diff-node="insert"') ||
      !chunks.html?.includes("ins") ||
      !unsupported.error
    )
      throw Error(JSON.stringify({ whole, chunks, unsupported }));
    return { whole, chunks, unsupported };
  }, `/assets/${worker}`);
  const report = { temporaryCheckout: temp, archive, worker, result };
  writeFileSync(
    join(root, "artifacts/integration-smoke.json"),
    JSON.stringify(report, null, 2),
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
