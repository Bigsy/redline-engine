# Astra high review — 2026-09-05

The user requested a code-and-plan review by `gpt-6-astra` with high reasoning. That review
completed and found the three issues below. All were fixed with regressions. Astra reported
no additional phase 1–2 blockers in marker ownership, operation parentage, watchdog handling,
benchmark claims or the packed worker smoke runner.

| Finding                                                                                                                               | Fix and verification                                                                                                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| P1: parse5's omitted fragment context is template, not body. Stray table cells could survive the engine and lose markers in Chromium. | The adapter creates an explicit HTML body context. Unit tests cover stray `tr`/`td` and `col`; Chromium verifies the canonical body result.                                                                                                                                                                                              |
| P1: identical serialization can hide namespace changes after MathML parser repair.                                                    | Success now compares projected DOM tuples against the original parsed trees, including element/attribute namespaces and raw text. Projected adjacent text nodes are coalesced. Unit and Chromium tests decline the `mglyph` and `malignmark` counterexamples. All supported Chromium fixtures now use independent DOM tuple comparisons. |
| P2: giant punctuation nodes were fully tokenized before the local token cap was checked.                                              | Token collection stops immediately after exceeding the combined 512-token cap and skips the other side when already over limit. A 1.9-million-unit punctuation pair has a coarse-result regression and an isolated benchmark case.                                                                                                       |

The follow-up Astra verification attempt could not run because the agent hit the account
usage limit. There is no second Astra sign-off. The primary agent completed the fixes and
reran typecheck, unit/Chromium checks, benchmarks and packed integration verification.
