# Compatibility inventory — Stage 2 acceptance and Stage 3 resource assessment

Recorded 2026-09-05 against `0.1.0-spike.1`. Stage 2 closes all 46 measured Stage 1
failures and adds 120 checks. **317/317 adapted acceptance checks pass, with no skips.**
The unchanged upstream baseline remains **87/87**; its manifest and source files are unchanged.
The original Stage 1 counts below remain historical evidence, not the current gate status.
No sibling/plugin replacement, development switch, runtime network calls or Rust/WASM was added.

## Standalone 0.1.0 release decision

The user accepted the 2.403-second extreme-output result for the standalone release. The
strict performance benchmark remains failing; functional assertions remain unchanged.
Fresh-process memory evidence and clean tarball consumer checks are recorded in the source
repository's `release/README.md`. Extension integration is a separate future session. Evidence
links below refer to the source checkout; tests and benchmarks are intentionally absent from
the npm tarball. The original Stage 3 blocking conclusion below is historical and superseded
by this explicit release decision.

## Stage 3 resource assessment

The Stage 3 measurement work is complete; its resource gate **does not pass**. See
[bench/STAGE3.md](bench/STAGE3.md), [distributions](bench/stage3-summary.json) and
[executable gate result](bench/stage3-gate.json). The small corpus and actual sibling
near-input-limit cases pass the provisional targets on this machine. The near-output-limit
expansion exceeds 2 seconds in Chromium, and production memory limits remain unresolved.
Stage 4 is blocked; Chromium measurements are not packaged JCEF validation.

The TypeScript changes bulk-adopt parse5 children in linear time and reserve output while
building the render plan. They preserve all Stage 2 assertions, including independent Chromium
projections, meaningful highlights, custom marker ownership and cross-inline formatting shells.
New checks cover differential stock-parser behavior, exact resource boundaries and the actual
15-second playground watchdog. Performance fixtures additionally receive independent browser
projections; density/start/wrapper fixtures require exact word highlights outside timing.

## Reproduce

```sh
pnpm run typecheck
pnpm run test
pnpm run test:upstream
pnpm run test:compatibility --reporter=json --outputFile=/tmp/redline-compat-results.json
# Run after the acceptance command even when it exits 1:
node test/compatibility/report.mjs /tmp/redline-compat-results.json
```

The acceptance suite requires the Playwright Chromium installation already used by
`test:browser` and permission to launch a local browser. It uses blank pages and detached
body elements, with no fixture navigation. happy-dom is used only to inspect highlights;
its script, iframe and stylesheet loading are disabled. No legacy runtime dependency was added.
The original suite and adapted acceptance suite have separate configs and commands;
`pnpm run test` remains the existing spike regression suite. The acceptance command is a
Stage 2 gate: all mandatory assertions are active; no skips, todos, or expected-failure
annotations hide missing functionality. Do not substitute the legacy baseline for this gate.

Current results:

| Evidence                                                     |  Passed | Failed | Skipped |
| ------------------------------------------------------------ | ------: | -----: | ------: |
| Unit regressions                                             |      40 |      0 |       0 |
| Unchanged upstream baseline                                  |      87 |      0 |       0 |
| Adapted upstream                                             |     123 |      0 |       0 |
| Adapted sibling, including all 42 sparse-locality assertions |      55 |      0 |       0 |
| Gaps/options and Stage 2 extensions                          |     139 |      0 |       0 |
| **Adapted acceptance total**                                 | **317** |  **0** |   **0** |
| Chromium/playground browser tests                            |      25 |      0 |       0 |

Typecheck, package build, playground build and formatting checks also pass. The two old unit
assertions that expected unsupported comments/templates now require supported comments and
reserved-metadata rejection inside templates; the acceptance requirements were not relaxed.

### Historical Stage 1 baseline

| Evidence                                                                              |  Passed | Failed | Skipped |
| ------------------------------------------------------------------------------------- | ------: | -----: | ------: |
| Existing unit tests                                                                   |      35 |      0 |       0 |
| Unchanged upstream suite on unchanged upstream engine                                 |      87 |      0 |       0 |
| Adapted upstream: 61 distinct pairs × preservation/precision, plus API smoke          |      95 |     28 |       0 |
| Sibling: 26 pairs × preservation/precision, plus three sparse locality checks         |      54 |      1 |       0 |
| Additional gaps/options: five pairs × preservation/precision, plus nine option checks |       2 |     17 |       0 |
| **Adapted acceptance total**                                                          | **151** | **46** |   **0** |

Machine-readable evidence: [baseline](test/upstream/baseline.json),
[acceptance results](test/compatibility/results.json). Recorded with Node 26.7.0 on
macOS arm64 and local Playwright Chromium. These are behavioral counts, not performance gates.

## Closed measured gaps and remaining limits

| Requirement                                     | Stage 2 result                                                                                                                                                                                                                                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plain-text word alignment / GAP-repetition      | Passing: unchanged context survives insertion/deletion/replacement, repeats and whitespace edits at the body root. Original plain-text fixtures remain unwrapped.                                                                                                                            |
| GAP-inline                                      | Passing: token ancestry maps shared text across inline nodes; conditional formatting shells preserve exact nesting in both projections. Added nested, original-ins, reversed and overlapping-range cases.                                                                                    |
| PL-sparse-start-insert                          | Passing: the inserted paragraph is a structural insertion, all 14 edits stay local, paragraph 0 has `was`/`edited` highlights, unchanged bold/link children are unmarked. Aligned and enclosing-wrapper variants also pass.                                                                  |
| OPT-className / OPT-dataPrefix / OPT-atomicTags | Passing: typed options, strict validation, exact-name matching, active namespace ownership and public/custom Chromium projections. `atomicTags` adds boundaries to mandatory safe defaults; see CONTRACT.md.                                                                                 |
| GAP-comments                                    | Passing: changed comments are retained in owned wrappers; restricted table/list containers expand to structural replacements. Comment-only changes are not inherently visible in layout.                                                                                                     |
| GAP-template                                    | Passing: templates are atomic, including nested content, namespaces and metadata validation. Independent Chromium tuples now include `template.content`; template-only changes are not visible in ordinary layout.                                                                           |
| GAP-leading-newline                             | Passing: serialization preserves parsed leading newlines in pre/textarea/listing, including nested identity and public projection. Preformatted changes remain atomic.                                                                                                                       |
| Content models / determinism / bounds           | Added malformed tables, table comments/whitespace, selects, foreign attributes/integration points, Unicode generated cases, repeatable output/journals and all six limit outcomes. Inline candidate assembly is also bounded.                                                                |
| Remaining representation limit                  | Malformed MathML `mtext/table/mglyph` and `malignmark` namespace-changing repairs remain explicitly unsupported. Arbitrary malformed content-model parity is not claimed.                                                                                                                    |
| Remaining precision limit                       | Local 512-token/128-edit refinement bounds (256 tokens per side for inline streams); crossed ranges that cannot form a valid shared tree fall back to structural alignment, with explicit coarse diagnostics on replacements. Required ordinary cases all retain their precision assertions. |
| Later gates                                     | Stage 3 distributions and Chromium layout measured; expansion target fails and host memory ceiling remains unresolved. Stage 4 plugin/JCEF integration is blocked.                                                                                                                              |

Actual output and visual review: [highlights.json](test/compatibility/highlights.json),
[Stage 2 screenshot](test/fixtures/visual/stage2-highlights.png) and
[review notes](test/fixtures/VISUAL-REVIEW.md). The screenshot was generated from actual
engine strings in Chromium and inspected; it includes source markup for otherwise invisible
comment markers. The JSON also records the actual sparse paragraph 0, all 14 local edits,
custom options, overlapping formatting and templates. Regenerate it with:

```sh
pnpm run build
node test/compatibility/highlights.mjs
pnpm run test:browser
```

Attribute/atomic and restricted-container replacements remain deliberate safe boundaries,
not permission for blanket coarse plain-text replacement. Moves remain delete/insert.

## Assertion policy and provenance

The exact published tarball, integrity, unchanged files and MIT notices are recorded in
[test/fixtures/upstream/PROVENANCE.md](test/fixtures/upstream/PROVENANCE.md).
The baseline validates a SHA-256 manifest before executing the original CommonJS specs in
isolated VM contexts. A small synchronous describe/beforeEach/it adapter runs their original
Chai assertions through the existing Vitest toolchain; no historical Mocha/build packages
are installed. Files get separate sloppy-mode contexts because originals assign undeclared
variables. Only the engine API calls are observed to capture example inputs; results are not
changed. The saved baseline is checked on subsequent runs; intentional regeneration uses
`UPDATE_UPSTREAM_BASELINE=1 pnpm run test:upstream` and requires reviewing the diff.

All 87 tests complete, but `from_port_source#03` executes **zero assertions**: the expression
`diff.should == '...'` cannot fail. The adapted deletion case checks both projections and
requires unchanged `a`/`c` to remain outside markers. Misleading titles are retained in the
inventory: `html_to_tokens#02` says “4” but asserts 7 tokens; `calculate_operations#23` says
“3 actions” but asserts 1; the middle insertion title says “on” for actual inserted “in”.

[upstream.json](test/compatibility/upstream.json) extracts public pairs without adding `<p>`
around plain text. Repeated internal count/index tests share a stable public requirement.
For three `findBestMatch` fixtures whose arrays contain bare words without space tokens,
the public adaptation inserts word separators: token identity does not imply the source was
`adogbites`. Single-input tokenizer examples become identity/preservation cases. The repeated
map gets a separate changed-text probe. Samples are retained as evidence; their full-document
head behavior is not silently made an engine requirement.

Each supported pair must reconstruct **both independently parsed Chromium DOM tuples**,
including namespace-qualified attributes, whitespace, comments, template contents and empty nodes. The checker
removes only owned markers, including side-specific formatting shells, and normalizes adjacent text nodes. It does not call the engine's
`project` as its oracle. Highlight checks separately require identity to have zero markers,
changes to have markers, unchanged context to remain outside markers where specified, and
atomic elements to have no generated descendants. Relevant structural selectors and inserted/
deleted text are checked explicitly. Context comparisons ignore whitespace _only for highlight
boundary grouping_; exact whitespace is still checked in DOM tuples. Legacy operation IDs,
wrapper grouping and duplicate inline markers inside a marked structural node are not required.

Corrections preserve whitespace/NBSP, trailing spaces, attributes/UUIDs, object fallback and
comments instead of reproducing silent loss. Malformed inputs are compared after body parsing;
invalid unmatched closing tags are not expected output. The callable export becomes the
versioned named API. Custom public options remain mandatory; CLI, CommonJS/RequireJS/script-tag
loaders and full-document/head assembly are **out of engine scope** (README requirements;
none of the 87 tests needs to be excluded wholesale for these host concerns).

## Implemented public option decision

The typed `compareBodies` fields are `className?: string`, `dataPrefix?: string` and
`atomicTags?: readonly string[]`. The legacy positional function and comma-separated syntax
need no facade. CONTRACT.md specifies exact grammars, defaults, null/empty policies and
projection metadata. Successful original option cases now assert both independent Chromium
projections and public `project` results, alongside their marker/atomic precision checks.

The **active** metadata namespace is reserved throughout the input, including templates and
foreign elements. This deliberately refines Stage 1's proposal to reserve both active and
default namespaces: with `dataPrefix: "review"`, original `data-diff-*` attributes are ordinary
content and survive both projections. Tests cover that ownership isolation, custom collisions,
invalid values, duplicate/empty atomic lists and exact tag-name boundaries. Mandatory safe
atomic content cannot be made unsafe with an option.

## Sibling mapping

Source commit: `484e6aaef6d74e4725e876eda633b6036b5b3000` in `../redline`.
MIT notice: [existing copied license](test/fixtures/legacy/LICENSE). Adapted inputs are in
[sibling.ts](test/compatibility/sibling.ts); the existing corpus is reused, not duplicated.
All full-document wrappers are removed because this library takes body fragments. Host warning
flags become actual preservation and marker assertions; inline and structural markers both count.

| Stable requirement(s)                                        | Source in frontend/src                                                                                      | Intentional adaptation / status                                                                                                                                        |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PL-header, PL-video-js, PL-style-guide, PL-default-atomic    | diff.test.ts / atomic-tag boundary regressions                                                              | Changes after prefix-sharing tags and default names remain marked — implemented.                                                                                       |
| PL-video                                                     | diff.test.ts / real atomic tags                                                                             | Structural marking of the video replaces legacy outer wrappers; no nested markers — implemented.                                                                       |
| PL-identity, PL-text, PL-mixed, PL-attributes                | diff.test.ts / truthfulness and under-reporting                                                             | Attribute-only and mixed changes now require representation, not a known-limitation banner — implemented.                                                              |
| PL-blocks-added, PL-blocks-removed, PL-blocks-added-reverse  | diff.test.ts / added and removed block elements                                                             | Actual list items and rows survive both sides without phantom empty elements; reverse row removal added — implemented.                                                 |
| PL-void-added, PL-void-added-reverse                         | diff.test.ts / bare-void insertion                                                                          | Require explicit `<hr>` insertion/removal rather than zero-marker noise — implemented.                                                                                 |
| PL-reindent, PL-space-added, PL-crlf                         | diff.test.ts / formatting-only detection                                                                    | Preserve actual whitespace, mark newly appearing inline spaces, normalize CRLF via body parsing; no UI classification — implemented.                                   |
| PL-pre, PL-inline-pre, PL-around-pre                         | diff.test.ts / preformatted whitespace                                                                      | Preservation/markers replace formatting-warning expectations — implemented.                                                                                            |
| PL-sparse-aligned, PL-sparse-wrapped, PL-sparse-start-insert | diff.test.ts / 700-paragraph fixture; PLAN.md benchmark variants                                            | Exact original paragraph generator; enclosing wrapper and start insertion extend it. Each of 14 edits must be local; all three variants pass all 14 local edits.       |
| PL-corpus-transaction-guide                                  | corpus.test.ts / generic and TOC/table regressions                                                          | Require TOC markers and inserted “Rate limits” and “250”, counting structural markers — implemented.                                                                   |
| PL-corpus-collection-guide                                   | corpus.test.ts / generic and class change                                                                   | Actual fixture changes `callout` to `callout warning` (test comment's “info” is descriptive, not an existing class). Require both marked class versions — implemented. |
| PL-corpus-welcome-pack                                       | corpus.test.ts / generic corpus                                                                             | Both-side reconstruction and meaningful nonzero markers — implemented.                                                                                                 |
| GAP-comments                                                 | diff.test.ts / ignores comment-only differences                                                             | Silent loss corrected to required preservation; changed comments now reconstruct with owned markers.                                                                   |
| HOST-only                                                    | diff.test.ts / sanitizer, CSP, heads, cancellation, workers and document assembly; viewer/navigation suites | **out of engine scope**; remain plugin integration gates. No host fallback, banners, formatting classification or worker-shortcut internals transplanted.              |

## Complete upstream test matrix

IDs use immutable filename stems plus the file-local `it(...)` ordinal (not global execution
order). Links include original source line numbers. “Implementation-only” rejects internal
shape requirements while retaining the mapped public intent where present. `INTERNAL` rows
are pending with no implementation required; all other states describe the mapped requirement,
not whether the unchanged legacy assertion passed. Comment identity does not complete comment
change support, and default-class text behavior does not complete `OPT-className`.

| Source test (file-local ordinal)                                                                            | Classification         | Requirement / status                              | Observable intent or disposition                                                                  |
| ----------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| [calculate_operations#01](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:10)  | implementation-only    | `INTERNAL` — pending — no implementation required | should be a function; internal shape not required                                                 |
| [calculate_operations#02](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:23)  | implementation-only    | `UP-calculate_operations#02` — implemented        | should result in 3 operations; internal shape not required; mapped public behavior is tested      |
| [calculate_operations#03](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:27)  | preserve               | `UP-calculate_operations#02` — implemented        | should replace "on"                                                                               |
| [calculate_operations#04](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:45)  | implementation-only    | `UP-calculate_operations#04` — implemented        | should result in 3 operations; internal shape not required; mapped public behavior is tested      |
| [calculate_operations#05](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:49)  | preserve               | `UP-calculate_operations#04` — implemented        | should show an insert for "on"                                                                    |
| [calculate_operations#06](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:66)  | implementation-only    | `UP-calculate_operations#06` — implemented        | should still have 3 operations; internal shape not required; mapped public behavior is tested     |
| [calculate_operations#07](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:70)  | preserve               | `UP-calculate_operations#06` — implemented        | should show a big insert                                                                          |
| [calculate_operations#08](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:89)  | implementation-only    | `UP-calculate_operations#08` — implemented        | should return 3 operations; internal shape not required; mapped public behavior is tested         |
| [calculate_operations#09](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:93)  | preserve               | `UP-calculate_operations#08` — implemented        | should show the delete in the middle                                                              |
| [calculate_operations#10](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:111) | implementation-only    | `UP-calculate_operations#10` — implemented        | should return a single op; internal shape not required; mapped public behavior is tested          |
| [calculate_operations#11](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:132) | implementation-only    | `UP-calculate_operations#11` — implemented        | should return 2 operations; internal shape not required; mapped public behavior is tested         |
| [calculate_operations#12](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:136) | preserve               | `UP-calculate_operations#11` — implemented        | should have a replace at the beginning                                                            |
| [calculate_operations#13](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:154) | implementation-only    | `UP-calculate_operations#13` — implemented        | should return 2 operations; internal shape not required; mapped public behavior is tested         |
| [calculate_operations#14](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:158) | preserve               | `UP-calculate_operations#13` — implemented        | should have an insert at the beginning                                                            |
| [calculate_operations#15](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:176) | implementation-only    | `UP-calculate_operations#15` — implemented        | should return 2 operations; internal shape not required; mapped public behavior is tested         |
| [calculate_operations#16](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:180) | preserve               | `UP-calculate_operations#15` — implemented        | should have a delete at the beginning                                                             |
| [calculate_operations#17](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:200) | implementation-only    | `UP-calculate_operations#17` — implemented        | should return 2 operations; internal shape not required; mapped public behavior is tested         |
| [calculate_operations#18](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:204) | preserve               | `UP-calculate_operations#17` — implemented        | should have a replace at the end                                                                  |
| [calculate_operations#19](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:222) | implementation-only    | `UP-calculate_operations#19` — implemented        | should return 2 operations; internal shape not required; mapped public behavior is tested         |
| [calculate_operations#20](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:226) | preserve               | `UP-calculate_operations#19` — implemented        | should have an Insert at the end                                                                  |
| [calculate_operations#21](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:244) | implementation-only    | `UP-calculate_operations#21` — implemented        | should have 2 operations; internal shape not required; mapped public behavior is tested           |
| [calculate_operations#22](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:248) | preserve               | `UP-calculate_operations#21` — implemented        | should have a delete at the end                                                                   |
| [calculate_operations#23](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:269) | implementation-only    | `UP-calculate_operations#23` — implemented        | should return 3 actions; internal shape not required; mapped public behavior is tested            |
| [calculate_operations#24](test/fixtures/upstream/node-htmldiff-0.9.4/test/calculate_operations.spec.js:273) | implementation-only    | `UP-calculate_operations#23` — implemented        | should have a replace first; internal shape not required; mapped public behavior is tested        |
| [diff#01](test/fixtures/upstream/node-htmldiff-0.9.4/test/diff.spec.js:15)                                  | preserve               | `UP-diff#01` — implemented                        | should return the text                                                                            |
| [diff#02](test/fixtures/upstream/node-htmldiff-0.9.4/test/diff.spec.js:25)                                  | preserve               | `UP-diff#02` — implemented                        | should mark the new letter                                                                        |
| [diff#03](test/fixtures/upstream/node-htmldiff-0.9.4/test/diff.spec.js:31)                                  | intentional correction | `UP-diff#03` — implemented                        | should collapse adjacent whitespace                                                               |
| [diff#04](test/fixtures/upstream/node-htmldiff-0.9.4/test/diff.spec.js:35)                                  | preserve               | `UP-diff#04` — implemented                        | should consider non-breaking spaces as equal                                                      |
| [diff#05](test/fixtures/upstream/node-htmldiff-0.9.4/test/diff.spec.js:39)                                  | intentional correction | `UP-diff#05` — implemented                        | should consider non-breaking spaces and non-adjacent regular spaces as equal                      |
| [diff#06](test/fixtures/upstream/node-htmldiff-0.9.4/test/diff.spec.js:45)                                  | preserve               | `OPT-className` — implemented                     | should include the class in the wrapper tags                                                      |
| [diff#07](test/fixtures/upstream/node-htmldiff-0.9.4/test/diff.spec.js:52)                                  | preserve               | `UP-diff#07` — implemented                        | show two images as different if their src attributes are different                                |
| [diff#08](test/fixtures/upstream/node-htmldiff-0.9.4/test/diff.spec.js:66)                                  | intentional correction | `UP-diff#08` — implemented                        | should show two images are the same if their src attributes are the same                          |
| [diff#09](test/fixtures/upstream/node-htmldiff-0.9.4/test/diff.spec.js:82)                                  | preserve               | `UP-diff#09` — implemented                        | show two widgets as different if their data attributes are different                              |
| [diff#10](test/fixtures/upstream/node-htmldiff-0.9.4/test/diff.spec.js:96)                                  | intentional correction | `UP-diff#10` — implemented                        | should show two widgets are the same if their data attributes are the same                        |
| [diff#11](test/fixtures/upstream/node-htmldiff-0.9.4/test/diff.spec.js:112)                                 | preserve               | `UP-diff#11` — implemented                        | should show two math elements as different if their contents are different                        |
| [diff#12](test/fixtures/upstream/node-htmldiff-0.9.4/test/diff.spec.js:128)                                 | intentional correction | `UP-diff#12` — implemented                        | should show two math elements as the same if their contents are the same                          |
| [diff#13](test/fixtures/upstream/node-htmldiff-0.9.4/test/diff.spec.js:146)                                 | preserve               | `UP-diff#13` — implemented                        | show two widgets as different if their data attributes are different                              |
| [diff#14](test/fixtures/upstream/node-htmldiff-0.9.4/test/diff.spec.js:163)                                 | intentional correction | `UP-diff#14` — implemented                        | should show two widgets are the same if their data attributes are the same                        |
| [diff#15](test/fixtures/upstream/node-htmldiff-0.9.4/test/diff.spec.js:181)                                 | preserve               | `UP-diff#15` — implemented                        | show two widgets as different if their data attributes are different                              |
| [diff#16](test/fixtures/upstream/node-htmldiff-0.9.4/test/diff.spec.js:195)                                 | intentional correction | `UP-diff#16` — implemented                        | should show two widgets are the same if their data attributes are the same                        |
| [find_matching_blocks#01](test/fixtures/upstream/node-htmldiff-0.9.4/test/find_matching_blocks.spec.js:21)  | implementation-only    | `INTERNAL` — pending — no implementation required | should be a function; internal shape not required                                                 |
| [find_matching_blocks#02](test/fixtures/upstream/node-htmldiff-0.9.4/test/find_matching_blocks.spec.js:30)  | implementation-only    | `GAP-repetition` — implemented                    | should find "a" twice; internal shape not required                                                |
| [find_matching_blocks#03](test/fixtures/upstream/node-htmldiff-0.9.4/test/find_matching_blocks.spec.js:34)  | implementation-only    | `GAP-repetition` — implemented                    | should find "a" at 0; internal shape not required                                                 |
| [find_matching_blocks#04](test/fixtures/upstream/node-htmldiff-0.9.4/test/find_matching_blocks.spec.js:38)  | implementation-only    | `GAP-repetition` — implemented                    | should find "a" at 3; internal shape not required                                                 |
| [find_matching_blocks#05](test/fixtures/upstream/node-htmldiff-0.9.4/test/find_matching_blocks.spec.js:42)  | implementation-only    | `GAP-repetition` — implemented                    | should find "has" at 2; internal shape not required                                               |
| [find_matching_blocks#06](test/fixtures/upstream/node-htmldiff-0.9.4/test/find_matching_blocks.spec.js:67)  | preserve               | `UP-find_matching_blocks#06` — implemented        | should match the match                                                                            |
| [find_matching_blocks#07](test/fixtures/upstream/node-htmldiff-0.9.4/test/find_matching_blocks.spec.js:83)  | preserve               | `UP-find_matching_blocks#07` — implemented        | should match with appropriate indexing                                                            |
| [find_matching_blocks#08](test/fixtures/upstream/node-htmldiff-0.9.4/test/find_matching_blocks.spec.js:100) | preserve               | `UP-find_matching_blocks#08` — implemented        | should return nothing                                                                             |
| [find_matching_blocks#09](test/fixtures/upstream/node-htmldiff-0.9.4/test/find_matching_blocks.spec.js:113) | implementation-only    | `INTERNAL` — pending — no implementation required | should be a function; internal shape not required                                                 |
| [find_matching_blocks#10](test/fixtures/upstream/node-htmldiff-0.9.4/test/find_matching_blocks.spec.js:126) | implementation-only    | `UP-find_matching_blocks#10` — implemented        | should return a match; internal shape not required; mapped public behavior is tested              |
| [find_matching_blocks#11](test/fixtures/upstream/node-htmldiff-0.9.4/test/find_matching_blocks.spec.js:139) | implementation-only    | `UP-find_matching_blocks#11` — implemented        | should return 3 matches; internal shape not required; mapped public behavior is tested            |
| [find_matching_blocks#12](test/fixtures/upstream/node-htmldiff-0.9.4/test/find_matching_blocks.spec.js:143) | implementation-only    | `UP-find_matching_blocks#11` — implemented        | should match "the"; internal shape not required; mapped public behavior is tested                 |
| [find_matching_blocks#13](test/fixtures/upstream/node-htmldiff-0.9.4/test/find_matching_blocks.spec.js:151) | implementation-only    | `UP-find_matching_blocks#11` — implemented        | should match "dog bit a"; internal shape not required; mapped public behavior is tested           |
| [find_matching_blocks#14](test/fixtures/upstream/node-htmldiff-0.9.4/test/find_matching_blocks.spec.js:159) | implementation-only    | `UP-find_matching_blocks#11` — implemented        | should match "man"; internal shape not required; mapped public behavior is tested                 |
| [from_port_source#01](test/fixtures/upstream/node-htmldiff-0.9.4/test/from_port_source.spec.js:8)           | preserve               | `UP-from_port_source#01` — implemented            | should diff text                                                                                  |
| [from_port_source#02](test/fixtures/upstream/node-htmldiff-0.9.4/test/from_port_source.spec.js:15)          | preserve               | `UP-from_port_source#02` — implemented            | should insert a letter and a space                                                                |
| [from_port_source#03](test/fixtures/upstream/node-htmldiff-0.9.4/test/from_port_source.spec.js:20)          | intentional correction | `UP-from_port_source#03` — implemented            | Replace ineffective diff.should == expression with actual deletion/context/projection assertions. |
| [from_port_source#04](test/fixtures/upstream/node-htmldiff-0.9.4/test/from_port_source.spec.js:25)          | preserve               | `UP-from_port_source#04` — implemented            | should change a letter                                                                            |
| [html_to_tokens#01](test/fixtures/upstream/node-htmldiff-0.9.4/test/html_to_tokens.spec.js:16)              | implementation-only    | `INTERNAL` — pending — no implementation required | should be a function; internal shape not required                                                 |
| [html_to_tokens#02](test/fixtures/upstream/node-htmldiff-0.9.4/test/html_to_tokens.spec.js:25)              | implementation-only    | `UP-html_to_tokens#02` — implemented              | should return 4; internal shape not required; mapped public behavior is tested                    |
| [html_to_tokens#03](test/fixtures/upstream/node-htmldiff-0.9.4/test/html_to_tokens.spec.js:35)              | implementation-only    | `UP-html_to_tokens#03` — implemented              | should return 11; internal shape not required; mapped public behavior is tested                   |
| [html_to_tokens#04](test/fixtures/upstream/node-htmldiff-0.9.4/test/html_to_tokens.spec.js:39)              | intentional correction | `UP-html_to_tokens#04` — implemented              | Preserve unchanged comments; removal is covered by GAP-comments (passing).                        |
| [html_to_tokens#05](test/fixtures/upstream/node-htmldiff-0.9.4/test/html_to_tokens.spec.js:45)              | preserve               | `UP-html_to_tokens#05` — implemented              | should identify contiguous whitespace as a single token                                           |
| [html_to_tokens#06](test/fixtures/upstream/node-htmldiff-0.9.4/test/html_to_tokens.spec.js:49)              | preserve               | `UP-html_to_tokens#06` — implemented              | should identify a single space as a single token                                                  |
| [html_to_tokens#07](test/fixtures/upstream/node-htmldiff-0.9.4/test/html_to_tokens.spec.js:53)              | intentional correction | `UP-html_to_tokens#07` — implemented              | should identify self closing tags as tokens                                                       |
| [html_to_tokens#08](test/fixtures/upstream/node-htmldiff-0.9.4/test/html_to_tokens.spec.js:59)              | preserve               | `UP-html_to_tokens#08` — implemented              | should identify an image tag as a single token                                                    |
| [html_to_tokens#09](test/fixtures/upstream/node-htmldiff-0.9.4/test/html_to_tokens.spec.js:64)              | preserve               | `UP-html_to_tokens#09` — implemented              | should identify an iframe tag as a single token                                                   |
| [html_to_tokens#10](test/fixtures/upstream/node-htmldiff-0.9.4/test/html_to_tokens.spec.js:69)              | preserve               | `UP-html_to_tokens#10` — implemented              | should identify an object tag as a single token                                                   |
| [html_to_tokens#11](test/fixtures/upstream/node-htmldiff-0.9.4/test/html_to_tokens.spec.js:76)              | preserve               | `UP-html_to_tokens#11` — implemented              | should identify a math tag as a single token                                                      |
| [html_to_tokens#12](test/fixtures/upstream/node-htmldiff-0.9.4/test/html_to_tokens.spec.js:92)              | preserve               | `UP-html_to_tokens#12` — implemented              | should identify an svg tag as a single token                                                      |
| [html_to_tokens#13](test/fixtures/upstream/node-htmldiff-0.9.4/test/html_to_tokens.spec.js:106)             | preserve               | `UP-html_to_tokens#13` — implemented              | should identify a script tag as a single token                                                    |
| [module#01](test/fixtures/upstream/node-htmldiff-0.9.4/test/module.spec.js:8)                               | intentional correction | `UP-module#01` — implemented                      | Named compareBodies/renderMerged/project exports replace callable legacy export.                  |
| [pain_games#01](test/fixtures/upstream/node-htmldiff-0.9.4/test/pain_games.spec.js:13)                      | preserve               | `UP-pain_games#01` — implemented                  | should replace the whole chunk                                                                    |
| [render_operations#01](test/fixtures/upstream/node-htmldiff-0.9.4/test/render_operations.spec.js:20)        | implementation-only    | `INTERNAL` — pending — no implementation required | should be a function; internal shape not required                                                 |
| [render_operations#02](test/fixtures/upstream/node-htmldiff-0.9.4/test/render_operations.spec.js:30)        | preserve               | `UP-html_to_tokens#02` — implemented              | should output the text                                                                            |
| [render_operations#03](test/fixtures/upstream/node-htmldiff-0.9.4/test/render_operations.spec.js:42)        | preserve               | `UP-render_operations#03` — implemented           | should wrap in an <ins>                                                                           |
| [render_operations#04](test/fixtures/upstream/node-htmldiff-0.9.4/test/render_operations.spec.js:55)        | preserve               | `UP-render_operations#04` — implemented           | should wrap in a <del>                                                                            |
| [render_operations#05](test/fixtures/upstream/node-htmldiff-0.9.4/test/render_operations.spec.js:67)        | preserve               | `UP-render_operations#05` — implemented           | should wrap in both <ins> and <del>                                                               |
| [render_operations#06](test/fixtures/upstream/node-htmldiff-0.9.4/test/render_operations.spec.js:82)        | preserve               | `UP-render_operations#06` — implemented           | should identify contained inserted tags                                                           |
| [render_operations#07](test/fixtures/upstream/node-htmldiff-0.9.4/test/render_operations.spec.js:88)        | preserve               | `UP-render_operations#07` — implemented           | should identify contained deleted tags                                                            |
| [render_operations#08](test/fixtures/upstream/node-htmldiff-0.9.4/test/render_operations.spec.js:96)        | intentional correction | `UP-render_operations#08` — implemented           | should not identify partial tags                                                                  |
| [render_operations#09](test/fixtures/upstream/node-htmldiff-0.9.4/test/render_operations.spec.js:113)       | preserve               | `UP-render_operations#09` — implemented           | should keep the change inside the <p>                                                             |
| [render_operations#10](test/fixtures/upstream/node-htmldiff-0.9.4/test/render_operations.spec.js:121)       | intentional correction | `UP-render_operations#10` — implemented           | should not be wrapped                                                                             |
| [render_operations#11](test/fixtures/upstream/node-htmldiff-0.9.4/test/render_operations.spec.js:132)       | intentional correction | `UP-render_operations#11` — implemented           | should treat attribute changes as equal and output the after tag                                  |
| [render_operations#12](test/fixtures/upstream/node-htmldiff-0.9.4/test/render_operations.spec.js:142)       | intentional correction | `UP-render_operations#12` — implemented           | should show changes within tags with different attributes                                         |
| [render_operations#13](test/fixtures/upstream/node-htmldiff-0.9.4/test/render_operations.spec.js:156)       | preserve               | `UP-render_operations#13` — implemented           | should wrap void tags                                                                             |
| [render_operations#14](test/fixtures/upstream/node-htmldiff-0.9.4/test/render_operations.spec.js:166)       | preserve               | `UP-render_operations#14` — implemented           | should wrap atomic tags                                                                           |
