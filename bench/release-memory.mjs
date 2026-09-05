import { execFileSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { cpus, totalmem } from "node:os";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
const server = await createServer({
  configFile: false,
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
});
await server.listen();
const rows = [];
try {
  for (let sample = 0; sample < 3; sample++) {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({
        viewport: { width: 1100, height: 900 },
      });
      await page.goto("http://127.0.0.1:5174");
      const cdp = await browser.newBrowserCDPSession();
      const pageCdp = await page.context().newCDPSession(page);
      const snapshots = [];
      const snapshot = async (stage) => {
        const { processInfo } = await cdp.send("SystemInfo.getProcessInfo");
        const values = execFileSync(
          "/bin/ps",
          ["-o", "rss=", "-p", processInfo.map((p) => p.id).join(",")],
          { encoding: "utf8" },
        )
          .trim()
          .split(/\s+/)
          .map(Number);
        snapshots.push({
          stage,
          rssMiB: values.reduce((a, b) => a + b, 0) / 1024,
          processCount: processInfo.length,
          mainHeap: await pageCdp.send("Runtime.getHeapUsage"),
        });
      };
      await snapshot("blank");
      await page.evaluate(async () => {
        const url = URL.createObjectURL(
          new Blob(
            [
              `import {compareBodies} from '${location.origin}/src/index.ts'; onmessage=({data})=>postMessage(compareBodies(data));`,
            ],
            { type: "text/javascript" },
          ),
        );
        window.memoryWorker = new Worker(url, { type: "module" });
        window.memoryResult = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => {
            window.memoryWorker.terminate();
            reject(Error("deadline"));
          }, 15000);
          window.memoryWorker.onmessage = ({ data }) => {
            clearTimeout(timer);
            resolve(data);
          };
          window.memoryWorker.onerror = (e) => {
            clearTimeout(timer);
            reject(Error(e.message));
          };
          window.memoryWorker.postMessage({
            beforeHtml: "<i>a</i>".repeat(70000),
            afterHtml: "<b>b</b>".repeat(70000),
          });
        });
        URL.revokeObjectURL(url);
        if (window.memoryResult.outcome !== "success")
          throw Error(window.memoryResult.outcome);
      });
      await snapshot("result-full-journal-worker-alive");
      const outputUnits = await page.evaluate(async () => {
        const frame = document.createElement("iframe");
        frame.sandbox = "allow-same-origin";
        frame.style.cssText = "width:1050px;height:800px";
        document.body.append(frame);
        const loaded = new Promise((resolve) => (frame.onload = resolve));
        frame.srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>body{font:16px/1.5 system-ui}ins,[data-diff-node=insert]{background:#dcfce7}del,[data-diff-node=delete]{background:#fee2e2}</style>${window.memoryResult.comparison.mergedHtml}`;
        await loaded;
        void frame.contentDocument.body.offsetHeight;
        await new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        );
        return window.memoryResult.comparison.mergedHtml.length;
      });
      await snapshot("frame-laid-out");
      await page.evaluate(() => {
        window.memoryWorker.terminate();
        window.memoryWorker = null;
        window.memoryResult = null;
        document.body.replaceChildren();
      });
      await pageCdp.send("HeapProfiler.collectGarbage");
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await snapshot("released-forced-main-gc");
      rows.push({
        sample,
        chromium: browser.version(),
        outputUnits,
        snapshots,
      });
      console.log(JSON.stringify(rows.at(-1)));
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
writeFileSync(
  new URL("./release-memory-results.json", import.meta.url),
  JSON.stringify(
    {
      date: new Date().toISOString(),
      machine: { cpu: cpus()[0].model, memoryBytes: totalmem() },
      method:
        "Three fresh Chromium processes; one unchanged 70000-element expansion each; full journal response, same Stage 3 frame style. Summed RSS snapshots across CDP process IDs can double-count shared pages and are not sampled peaks. Forced main-page GC only after timing-independent inspection and cleanup; worker terminated. No latency claim from this instrumented memory experiment.",
      rows,
    },
    null,
    2,
  ) + "\n",
);
