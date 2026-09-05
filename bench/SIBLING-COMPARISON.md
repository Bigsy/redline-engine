# Stage 3 rerun

The actual sibling files were read again without modification. The current raw
[sibling snapshot](sibling-results-2026-09-05.json) retains file hashes, all three variants,
three structural/shortcut samples where completed, and the 15-second legacy cutoffs.
The original aligned shortcut still qualifies only for the aligned pair; wrapper/start cases
hit its legacy fallback cutoff. See [STAGE3.md](STAGE3.md) for repeated cold/warm structural
samples and separate Chromium transport/layout; happy-dom shortcut timing is not browser layout.
The historical measurements below remain context, not the updated distribution.

# Direct comparison with the sibling Redline samples

Measured 2026-09-05 against the existing `../redline/testdata/large/generated/before.html`
and `after.html`, read directly without regeneration. Each contains 6,000 paragraphs; the
files total 1,981,674 bytes (roughly 1 MB each). These are the generator's synthetic sparse
edit documents. Original file hashes, runtime, per-run results and peak process RSS are
recorded in [sibling-results-2026-09-05.json](sibling-results-2026-09-05.json).

The legacy engine is imported directly from the sibling's current vendored node-htmldiff,
not from the benchmark copy. Three scenarios use the same bodies: the original pair,
both bodies enclosed in one section, and one paragraph inserted at the beginning of after.

| Scenario                       | New engine, median (range), 3 fresh-process samples | Raw legacy        | Plugin shortcut path                               |
| ------------------------------ | --------------------------------------------------- | ----------------- | -------------------------------------------------- |
| Existing 6,000-paragraph pair  | 506 ms (502–508 ms)                                 | Timed out at 15 s | Eligible; 422 ms (396–445 ms) in happy-dom harness |
| Same pair inside one section   | 514 ms (486–903 ms)                                 | Timed out at 15 s | Ineligible; timed out at 15 s                      |
| Same pair plus start insertion | 509 ms (479–521 ms)                                 | Timed out at 15 s | Ineligible; timed out at 15 s                      |

Every new-engine sample returns success after validating both projected DOM trees. The
insertion variant reports three coarse replacements; the other variants report none. The
903 ms wrapper sample is retained as observed variation, not discarded. Raw legacy was run
once per scenario; other paths ran three times unless the first run timed out. Timeouts are
hard process terminations and do not establish the legacy engine's eventual completion time.

The result supports the new engine's structural approach: it handles the original documents
and changes that disable the positional shortcut. It does **not** demonstrate that it is faster
than the plugin's shortcut on a pair that remains eligible for that shortcut.

## Timing boundaries and limits

Apple M1 Max, macOS arm64, Node version recorded in JSON. Shared full-document body extraction
occurs outside timing. New-engine elapsed time includes parsing, matching, rendering and both-side
validation. Raw legacy time covers only rendering and lacks equivalent validation. The
15-second cutoff includes child-process startup; elapsed timings exclude module loading.
There are too few samples for p95 or a production release gate.

For the plugin shortcut, the runner extracts and transpiles the actual `alignedBodyChunks`
function and its serialization helper from the current sibling `frontend/src/diff.ts`. The
function runs unchanged against happy-dom bodies. This timing includes that DOM parsing and
partitioning, plus legacy rendering of changed chunks. The original pair yields 241 chunks.
The wrapper and insertion fail the function's eligibility checks and fall back to whole-body
legacy execution. This is an algorithm-path comparison, **not real Chromium/JCEF viewer timing**;
happy-dom costs cannot be treated as the production browser's costs. Process RSS also includes
different supporting modules, so it is not an apples-to-apples engine allocation measurement.

Reproduce with `pnpm run bench:sibling`; `PLUGIN_ROOT` can override the sibling checkout.
It reads the existing generated files, writes this run's JSON, and never modifies the sibling.
The benchmark has no network calls. Browser layout, sanitization, worker startup/transfer,
visibility and full plugin behavior remain separate measurements.
