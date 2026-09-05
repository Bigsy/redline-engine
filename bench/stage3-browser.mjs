import { execFileSync } from "node:child_process";
import { chromium } from "@playwright/test";
import { createServer } from "vite";
import { writeFileSync } from "node:fs";
import { fixtures } from "./stage3-cases.mjs";
const server = await createServer({
  configFile: false,
  server: { host: "127.0.0.1", port: 5174, strictPort: true },
});
await server.listen();
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
await page.goto("http://127.0.0.1:5174");
const rows = [];
const browserCdp = await browser.newBrowserCDPSession();
try {
  for (const fixture of fixtures()) {
    const samples = await page.evaluate(async (fixture) => {
      const source = `import {compareBodies} from '${location.origin}/src/index.ts'; postMessage({ready:true}); onmessage=({data})=>{if(data.echo){postMessage(data);return;} const start=performance.now(); const result=compareBodies(data); postMessage({result,engineMs:performance.now()-start});};`;
      const url = URL.createObjectURL(
        new Blob([source], { type: "text/javascript" }),
      );
      const samples = [];
      let worker;
      const receive = () =>
        new Promise((resolve, reject) => {
          const t = setTimeout(() => {
            worker.terminate();
            reject(Error("15s worker deadline"));
          }, 15000);
          worker.onmessage = (e) => {
            clearTimeout(t);
            resolve(e.data);
          };
          worker.onerror = (e) => {
            clearTimeout(t);
            reject(Error(e.message));
          };
        });
      for (let i = 0; i < 21; i++) {
        let startupMs = 0;
        if (i === 0) {
          const start = performance.now();
          worker = new Worker(url, { type: "module" });
          await receive();
          startupMs = performance.now() - start;
        }
        let start = performance.now();
        let pending = receive();
        worker.postMessage({
          echo: true,
          beforeHtml: fixture.beforeHtml,
          afterHtml: fixture.afterHtml,
        });
        await pending;
        const echoRoundTripMs = performance.now() - start;
        start = performance.now();
        pending = receive();
        worker.postMessage(fixture);
        const { result, engineMs } = await pending;
        const roundTripMs = performance.now() - start;
        let layoutMs = 0,
          frameReadyMs = 0,
          outputUnits = 0;
        if (result.outcome === "success") {
          outputUnits = result.comparison.mergedHtml.length;
          if (i === 0) {
            const parsed = (value) => {
              const body = document.createElement("body");
              body.innerHTML = value;
              return body;
            };
            const shape = (n) =>
              n instanceof Element
                ? [
                    n.namespaceURI,
                    n.localName,
                    [...n.attributes]
                      .map((a) => [
                        a.namespaceURI,
                        a.prefix,
                        a.localName,
                        a.value,
                      ])
                      .sort(),
                    [
                      ...(n instanceof HTMLTemplateElement ? n.content : n)
                        .childNodes,
                    ].map(shape),
                  ]
                : [n.nodeType, n.nodeValue];
            for (const side of ["before", "after"]) {
              const body = parsed(result.comparison.mergedHtml);
              const visit = (parent) => {
                for (const n of [...parent.childNodes])
                  if (n instanceof Element) {
                    visit(n instanceof HTMLTemplateElement ? n.content : n);
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
                        if (a.name.startsWith("data-diff-"))
                          n.removeAttribute(a.name);
                  }
              };
              visit(body);
              body.normalize();
              if (
                JSON.stringify(shape(body)) !==
                JSON.stringify(shape(parsed(fixture[side + "Html"])))
              )
                throw Error(
                  fixture.name + " independent " + side + " projection",
                );
            }
            if (/^(edits|start|wrapper)-/.test(fixture.name)) {
              const body = parsed(result.comparison.mergedHtml);
              const insertions = [
                ...body.querySelectorAll("ins[data-diff-wrapper]"),
              ];
              const deletions = [
                ...body.querySelectorAll("del[data-diff-wrapper]"),
              ];
              if (
                !insertions.length ||
                insertions.some((n) => n.textContent !== "Changed") ||
                deletions.some((n) => n.textContent !== "Original")
              )
                throw Error(fixture.name + " word precision");
            }
          }

          const frame = document.createElement("iframe");
          frame.setAttribute("sandbox", "allow-same-origin");
          frame.style.cssText = "width:1050px;height:800px";
          document.body.replaceChildren(frame);
          const loaded = new Promise((resolve) => (frame.onload = resolve));
          start = performance.now();
          frame.srcdoc = `<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>body{font:16px/1.5 system-ui}ins,[data-diff-node=insert]{background:#dcfce7}del,[data-diff-node=delete]{background:#fee2e2}</style>${result.comparison.mergedHtml}`;
          await loaded;
          const layoutStart = performance.now();
          void frame.contentDocument.body.offsetHeight;
          layoutMs = performance.now() - layoutStart;
          await new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          );
          frameReadyMs = performance.now() - start;
          frame.remove();
        }
        samples.push({
          sample: i,
          startupMs,
          echoRoundTripMs,
          engineMs,
          roundTripMs,
          transportResidualMs: roundTripMs - engineMs,
          layoutMs,
          frameReadyMs,
          renderReadyMs: startupMs + roundTripMs + frameReadyMs,
          outcome: result.outcome,
          limit: result.limit,
          outputUnits,
          heapUsed: performance.memory?.usedJSHeapSize,
        });
      }
      worker.terminate();
      URL.revokeObjectURL(url);
      return samples;
    }, fixture);
    const { processInfo } = await browserCdp.send("SystemInfo.getProcessInfo");
    const rssKiB = execFileSync(
      "/bin/ps",
      ["-o", "rss=", "-p", processInfo.map((p) => p.id).join(",")],
      { encoding: "utf8" },
    )
      .trim()
      .split(/\s+/)
      .map(Number);
    rows.push({
      name: fixture.name,
      samples,
      browserProcessRssKiB: rssKiB.reduce((a, b) => a + b, 0),
      browserProcessCount: processInfo.length,
    });
    console.log(
      fixture.name,
      Math.round(Math.max(...samples.map((s) => s.renderReadyMs))),
      samples[0].outcome,
    );
    writeFileSync(
      new URL(
        process.env.STAGE3_EXTRA
          ? "./stage3-browser-extra-results.json"
          : "./stage3-browser-results.json",
        import.meta.url,
      ),
      JSON.stringify(
        {
          chromium: browser.version(),
          method:
            "Headless Chromium 1100x900; Vite source modules over localhost; one fresh worker first call plus 20 warm calls per fixture. Echo measures two-way input cloning; full result journal transported. Isolated iframe srcdoc load, forced layout, two animation frames; no sanitizer or packaged host CSS. Frame-ready includes parse/style/layout/frame scheduling; forced layout alone may be nearly zero after load. JS heap is approximate page heap; post-fixture summed process RSS from CDP process IDs and ps is a snapshot, not peak and may double-count shared pages.",
          rows,
        },
        null,
        2,
      ) + "\n",
    );
  }
} finally {
  await browser.close();
  await server.close();
}
