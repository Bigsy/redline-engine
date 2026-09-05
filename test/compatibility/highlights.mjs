// Reproduce after `pnpm run build`; test-only artifact, never shipped in the package.
import { writeFileSync } from "node:fs";
import { Window } from "happy-dom";
import { compareBodies } from "../../dist/index.js";
import { sibling } from "./sibling.ts";
const examples = [
  { id: "plain-text", before: "working on it", after: "working in it" },
  {
    id: "inline",
    before: "<p>the <b>quick</b> fox</p>",
    after: "<p>the quick <b>brown</b> fox</p>",
  },
  {
    id: "overlapping-inline",
    before: "<p><b>quick fox</b></p>",
    after: "<p>quick <b>brown fox</b></p>",
  },
  {
    id: "custom-options",
    before: "<p>old text</p>",
    after: "<p>new text</p>",
    className: "review-change",
    dataPrefix: "review",
  },
  {
    id: "comments",
    before: "<!-- reviewer note --><p>same</p>",
    after: "<p>same</p>",
  },
  {
    id: "template",
    before: "<template><p>old</p></template>",
    after: "<template><p>new</p></template>",
  },
  { id: "newline", before: "<pre>\n\na</pre>", after: "<pre>\n\nb</pre>" },
  sibling.find((f) => f.id === "PL-sparse-start-insert"),
];
const snapshots = examples.map((f) => {
  const r = compareBodies({
    beforeHtml: f.before,
    afterHtml: f.after,
    ...(f.className
      ? { className: f.className, dataPrefix: f.dataPrefix }
      : {}),
  });
  if (r.outcome !== "success") throw Error(`${f.id}: ${r.outcome}`);
  const body = new Window({
    settings: {
      disableCSSFileLoading: true,
      disableJavaScriptEvaluation: true,
      disableJavaScriptFileLoading: true,
      disableIframePageLoading: true,
    },
  }).document.createElement("body");
  body.innerHTML = r.comparison.mergedHtml;
  const sparse = f.id === "PL-sparse-start-insert";
  return {
    id: f.id,
    ...(sparse
      ? {
          insertedStart: body.querySelector("p").outerHTML,
          paragraph0: [...body.querySelectorAll("p")].find((p) =>
            p.textContent.startsWith("Paragraph 0 "),
          ).outerHTML,
          localEditedParagraphs: [...body.querySelectorAll("p")].filter((p) =>
            [...p.querySelectorAll("ins")]
              .map((e) => e.textContent)
              .join(" ")
              .includes("was edited"),
          ).length,
        }
      : { mergedHtml: r.comparison.mergedHtml }),
    operationCount: r.comparison.operations.length,
    coarseReplacements: r.comparison.diagnostics.filter(
      (d) => d.code === "coarse-replacement",
    ).length,
  };
});
writeFileSync(
  new URL("highlights.json", import.meta.url),
  JSON.stringify(snapshots, null, 2) + "\n",
);
console.log(`Recorded ${snapshots.length} actual highlight examples.`);
