import { describe, it, expect } from "vitest";
import { compareBodies, renderMerged } from "../../src/index.ts";
import {
  preservation,
  precision,
  parseBody,
  canonical,
  type Fixture,
} from "./check.ts";
const probes: Fixture[] = [
  {
    id: "GAP-inline",
    sources: ["PLAN.md Stage 2"],
    before: "<p>the <b>quick</b> fox</p>",
    after: "<p>the quick <b>brown</b> fox</p>",
    context: "thequickfox",
    inserted: ["brown"],
  },
  {
    id: "GAP-repetition",
    sources: ["find_matching_blocks#02–05"],
    before: "a apple has a worm",
    after: "a apple has a tiny worm",
    context: "aapplehasaworm",
    inserted: ["tiny"],
  },
  {
    id: "GAP-comments",
    sources: ["html_to_tokens#04; sibling comment-only"],
    before: "<!-- reviewer note --><p>same</p>",
    after: "<p>same</p>",
    context: "same",
  },
  {
    id: "GAP-template",
    sources: ["CONTRACT.md limitation"],
    before: "<template><p>old</p></template>",
    after: "<template><p>new</p></template>",
  },
  {
    id: "GAP-leading-newline",
    sources: ["CONTRACT.md limitation"],
    before: "<pre>\n\na</pre>",
    after: "<pre>\n\nb</pre>",
  },
];
for (const fixture of probes)
  describe(fixture.id, () => {
    it("independent both-side DOM reconstruction", () => preservation(fixture));
    it("meaningful highlights", () => precision(fixture));
  });
// Successful option cases also exercise the independent Chromium oracle.
async function options(extra: Record<string, unknown>) {
  const input = {
    beforeHtml: "<p>old text</p>",
    afterHtml: "<p>new text</p>",
    ...extra,
  };
  const result = compareBodies(input);
  expect(result.outcome).toBe("success");
  if (result.outcome !== "success") throw Error(result.outcome);
  const html = renderMerged(result.comparison).html;
  for (const side of ["before", "after"] as const) {
    const expected = await canonical(
      side === "before" ? input.beforeHtml : input.afterHtml,
    );
    expect(
      await canonical(
        html,
        side,
        typeof extra.dataPrefix === "string" ? extra.dataPrefix : "diff",
      ),
    ).toEqual(expected);
    expect(await canonical(project(result.comparison, side))).toEqual(expected);
  }
  return parseBody(html);
}
it("OPT-className custom generated wrapper class", async () => {
  const body = await options({ className: "review-change" });
  expect(
    body.querySelectorAll("ins.review-change,del.review-change"),
  ).toHaveLength(2);
});
it("OPT-dataPrefix custom generated metadata namespace", async () => {
  const body = await options({ dataPrefix: "review" });
  expect(
    body.querySelectorAll("[data-review-node][data-review-op]"),
  ).toHaveLength(2);
  expect(body.querySelector("[data-diff-node]")).toBeNull();
});
it("OPT-atomicTags configurable exact tag names", async () => {
  const body = await options({ atomicTags: ["p"] });
  expect(body.querySelectorAll("p[data-diff-node]")).toHaveLength(2);
  expect(body.querySelector("p [data-diff-node]")).toBeNull();
});
for (const [name, value] of [
  ["className", 'bad" class'],
  ["dataPrefix", "bad prefix"],
  ["atomicTags", ["p.*"]],
] as const)
  it(`OPT-validation rejects invalid ${name}`, () => {
    const input = { beforeHtml: "a", afterHtml: "b", [name]: value };
    expect(compareBodies(input).outcome).toBe("unsupported");
  });

it("OPT-roundtrip custom metadata preserves both independently parsed sides", async () => {
  const input = {
    beforeHtml: '<p><ins class="redline">original</ins> old</p>',
    afterHtml: '<p><ins class="redline">original</ins> new</p>',
    className: "review-change",
    dataPrefix: "review",
  };
  const r = compareBodies(input);
  expect(r.outcome).toBe("success");
  if (r.outcome !== "success") throw Error(r.outcome);
  for (const side of ["before", "after"] as const)
    expect(
      await canonical(renderMerged(r.comparison).html, side, "review"),
    ).toEqual(
      await canonical(side === "before" ? input.beforeHtml : input.afterHtml),
    );
});
it("OPT-reserved custom metadata cannot spoof generated markers", () => {
  const input = {
    beforeHtml: '<p data-review-node="insert">x</p>',
    afterHtml: '<p data-review-node="insert">x</p>',
    dataPrefix: "review",
  };
  expect(compareBodies(input).outcome).toBe("unsupported");
});
it("OPT-atomic-exact matches b without treating blockquote as atomic", async () => {
  const body = await options({
    beforeHtml: "<blockquote>old text</blockquote><b>old text</b>",
    afterHtml: "<blockquote>new text</blockquote><b>new text</b>",
    atomicTags: ["b"],
  });
  expect(body.querySelector("blockquote[data-diff-node]")).toBeNull();
  expect(body.querySelectorAll("b[data-diff-node]")).toHaveLength(2);
  expect(body.querySelector("b [data-diff-node]")).toBeNull();
});

const stage2: Fixture[] = [
  {
    id: "S2-listing-newline",
    before: "<listing>\n\na</listing>",
    after: "<listing>\n\nb</listing>",
    atomic: "listing",
    marked: ["listing[data-diff-node=insert]"],
  },
  {
    id: "S2-template-pre-newline",
    before: "<template><pre>\n\na</pre></template>",
    after: "<template><pre>\n\nb</pre></template>",
    marked: ["template[data-diff-node=insert]"],
  },
  {
    id: "S2-inline-overlapping-ranges",
    before: "<p><b>quick fox</b></p>",
    after: "<p>quick <b>brown fox</b></p>",
    context: "quickfox",
    inserted: ["brown"],
  },
  {
    id: "S2-inline-overlapping-reverse",
    before: "<p>quick <b>brown fox</b></p>",
    after: "<p><b>quick fox</b></p>",
    context: "quickfox",
    deleted: ["brown"],
  },
  {
    id: "S2-inline-nested",
    before: "<p>the <em><b>quick</b></em> fox</p>",
    after: "<p>the quick <em><b>brown</b></em> fox</p>",
    context: "thequickfox",
    inserted: ["brown"],
  },
  {
    id: "S2-inline-reverse",
    before: "<p>the quick <b>brown</b> fox</p>",
    after: "<p>the <b>quick</b> fox</p>",
    context: "thequickfox",
    deleted: ["brown"],
  },
  {
    id: "S2-inline-atomic",
    before: "old<img src=x> text",
    after: "new<img src=x> text",
    context: "text",
    inserted: ["new"],
    deleted: ["old"],
  },
  {
    id: "S2-inline-owned-ins",
    before: "<p>the <ins>quick</ins> fox</p>",
    after: "<p>the quick <b>brown</b> fox</p>",
    context: "thequickfox",
    inserted: ["brown"],
  },
  {
    id: "S2-comment-table",
    before: "<table><!--old--><tr><td>same</td></tr></table>",
    after: "<table><!--new--><tr><td>same</td></tr></table>",
    marked: ["table[data-diff-node=delete]", "table[data-diff-node=insert]"],
  },
  {
    id: "S2-table-whitespace",
    before: "<table>\n<tr><td>a</td></tr></table>",
    after: "<table>\n\n<tr><td>a</td></tr></table>",
    marked: ["table[data-diff-node]"],
  },
  {
    id: "S2-select",
    before: "<select><option>a</option></select>",
    after: "<select><option>b</option></select>",
    atomic: "select",
    marked: ["select[data-diff-node=insert]"],
  },
  {
    id: "S2-nested-template",
    before:
      "<template><template><!--old--><svg><text>a</text></svg></template></template>",
    after:
      "<template><template><!--new--><svg><text>b</text></svg></template></template>",
    marked: ["template[data-diff-node=insert]"],
  },
  {
    id: "S2-template-identity",
    before: "<template><!--same--><p>same</p></template>",
    after: "<template><!--same--><p>same</p></template>",
  },
  {
    id: "S2-textarea-newline",
    before: "<textarea>\n\na</textarea>",
    after: "<textarea>\n\nb</textarea>",
    atomic: "textarea",
    marked: ["textarea[data-diff-node=insert]"],
  },
  {
    id: "S2-nested-pre-identity",
    before: "<div><pre>\n\na</pre></div>",
    after: "<div><pre>\n\na</pre></div>",
  },
  {
    id: "S2-svg-namespace",
    before: '<svg><a xlink:href="#old"><text>a</text></a></svg>',
    after: '<svg><a xlink:href="#new"><text>a</text></a></svg>',
    marked: ["svg[data-diff-node=insert]"],
  },
  {
    id: "S2-math-integration",
    before: "<math><mtext><b>old</b></mtext></math>",
    after: "<math><mtext><b>new</b></mtext></math>",
    marked: ["math[data-diff-node=insert]"],
  },
  {
    id: "S2-malformed-table",
    before: "<table><td>old",
    after: "<table><td>new",
    inserted: ["new"],
    deleted: ["old"],
  },
].map((f) => ({ ...f, sources: ["Stage 2 adversarial coverage"] }));
for (let seed = 0; seed < 12; seed++) {
  const text = `α${seed} café e\u0301 🙂 &amp; repeated repeated`;
  stage2.push({
    id: `S2-generated-${seed}`,
    sources: ["deterministic generated cases"],
    before: `<div><p>${text} old end</p><p>stable ${seed}</p></div>`,
    after: `<div><p>${text} new end</p><p>stable ${seed}</p></div>`,
    context: `α${seed}cafée\u0301🙂&repeatedrepeatedendstable${seed}`,
    inserted: ["new"],
    deleted: ["old"],
  });
}
for (const f of stage2)
  describe(f.id, () => {
    it("independent both-side DOM reconstruction", () => preservation(f));
    it("meaningful highlights", () => precision(f));
    it("deterministic rendering and operation journal", () => {
      const input = { beforeHtml: f.before, afterHtml: f.after };
      const a = compareBodies(input),
        b = compareBodies(input);
      expect(a.outcome).toBe("success");
      expect(b.outcome).toBe("success");
      if (a.outcome !== "success" || b.outcome !== "success")
        throw Error("unsupported");
      expect(a.comparison.mergedHtml).toBe(b.comparison.mergedHtml);
      expect(a.comparison.operations).toEqual(b.comparison.operations);
      expect(a.comparison.diagnostics).toEqual(b.comparison.diagnostics);
      const identity = compareBodies({
        beforeHtml: f.before,
        afterHtml: f.before,
      });
      expect(identity.outcome).toBe("success");
      if (identity.outcome === "success")
        expect(
          identity.comparison.operations.every((o) => o.kind === "unchanged"),
        ).toBe(true);
    });
  });

import { project, type CompareBodiesInput } from "../../src/index.ts";
for (const extra of [
  { className: "change_2", dataPrefix: "review-v2", atomicTags: [] },
  { className: "change", dataPrefix: "review", atomicTags: ["p", "p"] },
  { dataPrefix: "review", atomicTags: ["video"] },
])
  it(`S2-options projections and ownership ${JSON.stringify(extra)}`, async () => {
    const input = {
      beforeHtml:
        '<p data-diff-node="original"><ins class="redline">old</ins> text</p><video-js>old</video-js>',
      afterHtml:
        '<p data-diff-node="original"><ins class="redline">new</ins> text</p><video-js>new</video-js>',
      ...extra,
    };
    const r = compareBodies(input);
    expect(r.outcome).toBe("success");
    if (r.outcome !== "success") throw Error(r.outcome);
    const prefix = extra.dataPrefix;
    expect(
      parseBody(r.comparison.mergedHtml).querySelector(`[data-${prefix}-node]`),
    ).not.toBeNull();
    for (const side of ["before", "after"] as const) {
      const expected = await canonical(
        side === "before" ? input.beforeHtml : input.afterHtml,
      );
      expect(await canonical(r.comparison.mergedHtml, side, prefix)).toEqual(
        expected,
      );
      expect(await canonical(project(r.comparison, side))).toEqual(expected);
    }
  });
for (const [key, value] of [
  ["className", ""],
  ["className", null],
  ["className", 3],
  ["className", "two classes"],
  ["className", "x<y"],
  ["dataPrefix", ""],
  ["dataPrefix", null],
  ["dataPrefix", "UPPER"],
  ["dataPrefix", "a--b"],
  ["dataPrefix", 'x"'],
  ["atomicTags", null],
  ["atomicTags", "p"],
  ["atomicTags", ["P"]],
  ["atomicTags", [null]],
  ["atomicTags", ["b*"]],
] as const)
  it(`S2-invalid ${key}=${JSON.stringify(value)} returns bounded unsupported`, () => {
    const input = {
      beforeHtml: "same",
      afterHtml: "same",
      [key]: value,
    } as unknown as CompareBodiesInput;
    expect(compareBodies(input)).toMatchObject({ outcome: "unsupported" });
  });
for (const source of [
  '<template><p data-review-op="spoof">x</p></template>',
  '<svg data-review-unwrap="after"></svg>',
  "<ins data-review-wrapper>x</ins>",
])
  it(`S2-reserved nested metadata ${source}`, () =>
    expect(
      compareBodies({
        beforeHtml: source,
        afterHtml: source,
        dataPrefix: "review",
      }).outcome,
    ).toBe("unsupported"));
for (const [limit, value] of Object.entries({
  maxInputUnits: 1,
  maxNodes: 1,
  maxDepth: 1,
  maxWork: 1,
  maxOutputUnits: 1,
  timeoutMs: 0,
}))
  it(`S2-bounded inline/template ${limit}`, () => {
    const r = compareBodies({
      beforeHtml: "<template><p>old</p></template><p>the <b>quick</b> fox</p>",
      afterHtml:
        "<template><p>new</p></template><p>the quick <b>brown</b> fox</p>",
      limits: { [limit]: value },
    });
    expect(r).toMatchObject({ outcome: "limit", limit });
    expect(r).not.toHaveProperty("comparison");
  });
for (const tag of ["mglyph", "malignmark"])
  it(`S2-namespace repair ${tag} declines truthfully`, () => {
    const source = `<math><mtext><table><${tag}>`;
    expect(
      compareBodies({ beforeHtml: source, afterHtml: source }).outcome,
    ).toBe("unsupported");
  });
it("S2-local token exhaustion preserves both Chromium projections with explicit coarse diagnostic", async () => {
  const f = {
    id: "bounded",
    sources: [],
    before: `<p>${"word ".repeat(600)}<b>old</b></p>`,
    after: `<p>${"other ".repeat(600)}<b>new</b></p>`,
  };
  await preservation(f);
  await precision(f);
  const r = compareBodies({ beforeHtml: f.before, afterHtml: f.after });
  expect(r.outcome).toBe("success");
  if (r.outcome === "success")
    expect(
      r.comparison.diagnostics.some((d) => d.code === "coarse-replacement"),
    ).toBe(true);
});
