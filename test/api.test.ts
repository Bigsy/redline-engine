import { describe, expect, it } from "vitest";
import { Window } from "happy-dom";
import {
  compareBodies,
  project,
  renderMerged,
  type Limits,
} from "../src/index.ts";
import { cases, structural } from "./fixtures/cases.ts";

// Independent DOM projection, separate from the parse5 implementation under test.
function browserProject(source: string, side?: "before" | "after") {
  const window = new Window();
  const body = window.document.createElement("div");
  body.innerHTML = source;
  if (side)
    for (const e of [
      ...body.querySelectorAll("[data-diff-node],[data-diff-unwrap]"),
    ]) {
      if (
        e.getAttribute("data-diff-node") ===
        (side === "before" ? "insert" : "delete")
      ) {
        e.remove();
        continue;
      }
      if (
        e.hasAttribute("data-diff-wrapper") ||
        e.getAttribute("data-diff-unwrap") === side
      )
        e.replaceWith(...e.childNodes);
      else
        for (const attr of [...e.attributes])
          if (attr.name.startsWith("data-diff-")) e.removeAttribute(attr.name);
    }
  return body.innerHTML;
}
describe("structural comparison", () => {
  for (const fixture of cases)
    it(fixture.name, () => {
      const r = compareBodies({
        beforeHtml: fixture.before,
        afterHtml: fixture.after,
      });
      expect(r.outcome, JSON.stringify(r)).toBe("success");
      if (r.outcome !== "success") return;
      const merged = renderMerged(r.comparison).html;
      for (const side of ["before", "after"] as const) {
        expect(browserProject(merged, side)).toBe(
          browserProject(fixture[side]),
        );
        expect(browserProject(project(r.comparison, side))).toBe(
          browserProject(fixture[side]),
        );
      }
      expect(merged).toContain("data-diff-node");
      const again = compareBodies({
        beforeHtml: fixture.before,
        afterHtml: fixture.after,
      });
      if (again.outcome === "success")
        expect(again.comparison.mergedHtml).toBe(merged);
    });
  it("identity preserves empty nodes, comments, attributes and whitespace without markers", () => {
    const s =
      '<div class="redline"> \n<p></p><!--ok--><img src="a"><pre> \t </pre></div>';
    const r = compareBodies({ beforeHtml: s, afterHtml: s });
    expect(r.outcome).toBe("success");
    if (r.outcome === "success") expect(r.comparison.mergedHtml).toBe(s);
  });
  it("anchors a start insertion through nested wrappers", () => {
    const f = structural(2000),
      r = compareBodies({ beforeHtml: f.before, afterHtml: f.after });
    expect(r.outcome).toBe("success");
    if (r.outcome === "success")
      expect(
        r.comparison.operations.filter((o) => o.kind === "insert"),
      ).toHaveLength(1);
  });
  for (const limit of [
    "maxInputUnits",
    "maxNodes",
    "maxDepth",
    "maxWork",
    "maxOutputUnits",
    "timeoutMs",
  ] as (keyof Limits)[])
    it(`bounds ${limit}`, () => {
      expect(
        compareBodies({
          beforeHtml: "<div><p>a</p></div>",
          afterHtml: "<div><p>b</p></div>",
          limits: { [limit]: 0 },
        }),
      ).toMatchObject({ outcome: "limit", limit });
    });
  it("declines reserved metadata, including inside templates", () => {
    for (const s of [
      '<p data-diff-node="insert">a</p>',
      '<template><p data-diff-op="spoof">A</p></template>',
    ])
      expect(compareBodies({ beforeHtml: s, afterHtml: s }).outcome).toBe(
        "unsupported",
      );
  });
  it("falls back to coarse replacement for large local edits", () => {
    const r = compareBodies({
      beforeHtml: `<p>${"a ".repeat(600)}</p>`,
      afterHtml: `<p>${"b ".repeat(600)}</p>`,
    });
    expect(r.outcome).toBe("success");
    if (r.outcome === "success")
      expect(
        r.comparison.diagnostics.some((d) => d.code === "coarse-replacement"),
      ).toBe(true);
  });
  it("represents changed comments explicitly", () =>
    expect(
      compareBodies({ beforeHtml: "<!--a-->", afterHtml: "<!--b-->" }).outcome,
    ).toBe("success"));
  it("bounds deep trees", () =>
    expect(
      compareBodies({
        beforeHtml: "<div>".repeat(300) + "x" + "</div>".repeat(300),
        afterHtml: "",
      }).outcome,
    ).toBe("limit"));
});

describe("representation regressions", () => {
  it("aligns an inserted row using unchanged cell evidence", () => {
    const fixture = cases.find((f) => f.name === "table")!;
    const result = compareBodies({
      beforeHtml: fixture.before,
      afterHtml: fixture.after,
    });
    expect(result.outcome).toBe("success");
    if (result.outcome !== "success") return;
    expect(result.comparison.mergedHtml).toMatch(
      /<tr data-diff-node="insert"[^>]*><td>New<\/td><\/tr>/,
    );
    const ids = new Set(result.comparison.operations.map((o) => o.id));
    for (const operation of result.comparison.operations)
      if (operation.parentId) expect(ids.has(operation.parentId)).toBe(true);
  });
  it("bounds marker expansion rather than just input size", () => {
    const result = compareBodies({
      beforeHtml: "<p>a</p>",
      afterHtml: "<p>b</p>",
      limits: { maxOutputUnits: 30 },
    });
    expect(result).toMatchObject({ outcome: "limit", limit: "maxOutputUnits" });
  });
  it("reports invalid budgets without throwing", () => {
    for (const maxWork of [-1, NaN, Infinity])
      expect(
        compareBodies({ beforeHtml: "", afterHtml: "", limits: { maxWork } })
          .outcome,
      ).toBe("unsupported");
  });
  it("preserves empty input without markers", () => {
    const result = compareBodies({ beforeHtml: "", afterHtml: "" });
    expect(result.outcome).toBe("success");
    if (result.outcome === "success")
      expect(renderMerged(result.comparison).html).toBe("");
  });
});

describe("Astra review regressions", () => {
  it("uses body context for stray table-only tags", () => {
    for (const [beforeHtml, afterHtml, expected] of [
      ['<tr><td class="a">A</td></tr>', '<tr><td class="b">A</td></tr>', "A"],
      ["<col>", "", ""],
    ]) {
      const result = compareBodies({
        beforeHtml: beforeHtml!,
        afterHtml: afterHtml!,
      });
      expect(result.outcome).toBe("success");
      if (result.outcome === "success")
        expect(result.comparison.mergedHtml).toBe(expected);
    }
  });
  it("does not use serialization as proof of namespace preservation", () => {
    for (const tag of ["mglyph", "malignmark"]) {
      const source = `<math><mtext><table><${tag}>`;
      expect(
        compareBodies({ beforeHtml: source, afterHtml: source }).outcome,
      ).toBe("unsupported");
    }
  });
  it("ignores attribute order while preserving namespace-qualified attribute values", () => {
    const result = compareBodies({
      beforeHtml: '<p title="b" id="a">x</p>',
      afterHtml: '<p id="a" title="b">x</p>',
    });
    expect(result.outcome).toBe("success");
    if (result.outcome === "success")
      expect(result.comparison.mergedHtml).not.toContain("data-diff-");
  });
  it("coarsens giant punctuation text without tokenizing the full input", () => {
    const result = compareBodies({
      beforeHtml: `<p>${".".repeat(950000)}</p>`,
      afterHtml: `<p>${",".repeat(950000)}</p>`,
    });
    expect(result.outcome).toBe("success");
    if (result.outcome === "success") {
      expect(
        result.comparison.diagnostics.some(
          (d) => d.code === "coarse-replacement",
        ),
      ).toBe(true);
      expect(result.comparison.operations.length).toBe(2);
    }
  });
});
