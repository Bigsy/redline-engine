# Representative redlines — spike review, 2026-09-05

The following Chromium playground captures were visually inspected during implementation.
All four also pass independent before/after DOM reconstruction checks. This records an
engineering review of the narrow representation, not approval of arbitrary CSS or a release.
To reproduce: `pnpm run test:browser` writes current captures to `test-results/example-*.png`.
Timing values in screenshots are incidental, not benchmark evidence.

| Example                                                | Accepted spike behavior                                                                                                                                           |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Word change](visual/example-words.png)                | Deleted and inserted words and punctuation are visible; original whitespace survives. Adjacent old/new tokens deliberately have no added source whitespace.       |
| [Table](visual/example-table.png)                      | A new row precedes the matched original row; its changed cell is refined inline. Rows remain actual table rows, without invalid wrappers.                         |
| [Attribute-only change](visual/example-attributes.png) | Two marked paragraphs expose the otherwise invisible title change. The coarse diagnostic identifies the replacement, even though their visible text is identical. |
| [List restructuring](visual/example-list.png)          | The original unordered list and replacement ordered list are each marked as whole lists. The extra space is an accepted cost of truthful coarse output.           |

A row-lookahead experiment initially moved whitespace siblings into invalid table wrappers
on the transaction-guide fixture. The both-side validator declined that result, and Chromium
caught the corpus regression. Lookahead now applies only across bounded element-only spans;
the transaction guide is supported again. This is why merged-output validation is mandatory.

The recorded legacy attribute-only output is unmarked. Preserving that behavior would hide a
material change; the new coarse output is the intentional compatibility difference. Legacy
results for complex tables/lists are not a correctness oracle.

The later [Astra review](../../REVIEW.md) strengthened the projection check from serialized
HTML to DOM tuples, including namespaces, and fixed the explicit body parser context. The
representative layouts are unchanged; their checks pass with the stronger validator.

## Stage 2 actual highlight review — 2026-09-05

Inspected `visual/stage2-highlights.png`, captured from real comparison output by the
Chromium browser suite, and `../compatibility/highlights.json` (eight actual-output samples).
The screenshot CSS gives formatting shells a dashed outline for inspection; that outline is
review scaffolding, not a library stylesheet or an implemented plugin affordance.

- Plain text: only `on`/`in` is red/green; `working` and `it` remain unmarked. Adjacent deleted
  and inserted words have no invented separator, preserving exact projected whitespace.
- Inline shift: `quick` appears once and is not a content deletion; its bold shell unwraps on
  the after side. `brown` is green and bold, with an inserted trailing space. Both projected
  trees are independently checked, including overlapping and nested formatting variants.
- Atomic insertion: `old`/`new` are marked; the inserted `br` puts shared `text` on a new line
  in the merged view. Removing the inserted element restores the original before line.
- Comment deletion: visible text stays `same`; source markup confirms an owned deletion
  containing the original comment. There is no visible comment glyph in ordinary HTML.
- Leading newline: separate red/green pre blocks retain the blank first line. Templates also
  use structural before/after markers; their contents remain inert/invisible in ordinary layout.
- Sparse insertion: JSON inspection confirms a marked inserted-start paragraph, **14** local
  edited paragraphs, no coarse replacements, and paragraph 0's unchanged `b`/`a` children.
  `was` and `edited` are separate spans with shared whitespace, matching the other variants.
- Custom options: generated wrappers use `review-change` and `data-review-*`; source markup
  shows the selected namespace consistently. Public and independent Chromium projections pass.

These are representative layout/source observations, not JCEF or complete host styling
validation. Hidden-content presentation, formatting-marker navigation and CSS interaction
remain host responsibilities for Stage 4.
