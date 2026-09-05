import DOMPurify from "dompurify";
import { cases, structural } from "../test/fixtures/cases.ts";
import type { ComparisonResult } from "../src/index.ts";
import "./style.css";
const before = document.querySelector<HTMLTextAreaElement>("#before")!;
const after = document.querySelector<HTMLTextAreaElement>("#after")!;
const status = document.querySelector<HTMLElement>("#status")!;
const diagnostics = document.querySelector<HTMLElement>("#diagnostics")!;
const select = document.querySelector<HTMLSelectElement>("#fixture")!;
const options = [
  ...cases,
  { name: "large nested insertion", ...structural(6000) },
  {
    name: "coarse local replacement",
    before: `<p>${"old ".repeat(600)}</p>`,
    after: `<p>${"new ".repeat(600)}</p>`,
  },
];
for (const [i, f] of options.entries())
  select.add(new Option(f.name, String(i)));
const style =
  'body{font:16px/1.5 system-ui;padding:16px;color:#17212b}table{border-collapse:collapse}td,th{border:1px solid #aaa;padding:6px}ins.redline,[data-diff-node="insert"]{background:#dcfce7;outline:1px solid #16a34a}del.redline,[data-diff-node="delete"]{background:#fee2e2;outline:1px solid #dc2626}';
function show(id: string, html: string) {
  document.querySelector<HTMLIFrameElement>(id)!.srcdoc =
    `<!doctype html><html><head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src 'none'; form-action 'none'; base-uri 'none'"><style>${style}</style></head><body>${html}</body></html>`;
}
let worker: Worker | undefined,
  timer: ReturnType<typeof setTimeout> | undefined;
function stop() {
  worker?.terminate();
  worker = undefined;
  clearTimeout(timer);
}
function run() {
  stop();
  // Host boundary: sanitize before comparing, then isolate every displayed document.
  const clean = (s: string) =>
    DOMPurify.sanitize(s, {
      USE_PROFILES: { html: true },
      FORBID_TAGS: ["style", "link", "iframe", "form"],
      FORBID_ATTR: ["src", "srcset", "href", "action"],
      ALLOW_DATA_ATTR: false,
    });
  const beforeHtml = clean(before.value),
    afterHtml = clean(after.value);
  show("#before-view", beforeHtml);
  show("#after-view", afterHtml);
  show("#merged-view", "");
  status.textContent = "Comparing in worker…";
  diagnostics.textContent = "";
  try {
    worker = new Worker(new URL("./worker.ts", import.meta.url), {
      type: "module",
    });
  } catch (error) {
    status.textContent = "Engine unavailable";
    diagnostics.textContent = String(error);
    return;
  }
  worker.onmessage = ({ data }: { data: ComparisonResult }) => {
    status.textContent = data.outcome;
    if (data.outcome === "success") {
      show("#merged-view", data.comparison.mergedHtml);
      diagnostics.textContent = JSON.stringify(
        {
          diagnostics: data.comparison.diagnostics,
          timings: data.comparison.timings,
          operations: data.comparison.operations.length,
        },
        null,
        2,
      );
    } else diagnostics.textContent = JSON.stringify(data, null, 2);
    stop();
  };
  worker.onerror = (event) => {
    status.textContent = "Engine unavailable";
    diagnostics.textContent = event.message;
    stop();
  };
  timer = setTimeout(() => {
    stop();
    status.textContent = "Worker deadline exceeded";
  }, 15000);
  worker.postMessage({
    beforeHtml,
    afterHtml,
    limits: document.querySelector<HTMLInputElement>("#limit")!.checked
      ? { maxWork: 10 }
      : {},
  });
}
select.onchange = () => {
  const f = options[Number(select.value)]!;
  before.value = f.before;
  after.value = f.after;
  run();
};
document.querySelector("#compare")!.addEventListener("click", run);
document.querySelector("#cancel")!.addEventListener("click", () => {
  stop();
  status.textContent = "Cancelled";
});
before.value = options[0]!.before;
after.value = options[0]!.after;
run();
