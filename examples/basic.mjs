import { compareBodies, project, renderMerged } from "redline-engine";

// Inputs are already sanitized body fragments. Use a worker for user-supplied documents.
const result = compareBodies({
  beforeHtml: "<p>Hello <b>old</b> world.</p>",
  afterHtml: "<p>Hello <b>new</b> world.</p>",
});
if (result.outcome === "success") {
  const { html } = renderMerged(result.comparison);
  console.log(html);
  console.log(project(result.comparison, "before"));
  console.log(project(result.comparison, "after"));
} else {
  console.error(result.outcome, result.diagnostics);
}
