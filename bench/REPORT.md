# Latest gate: Stage 3

The original spike evidence below is historical. See [STAGE3.md](STAGE3.md) for the completed
Stage 3 assessment, before/after measurements, cold/warm distributions, real Chromium layout,
memory and boundary results. The resource gate fails on near-output-limit expansion and does
not authorize Stage 4. The original isolated harness was rerun before and after optimization;
[before](stage3-isolated-before.json) and [after](stage3-isolated-after.json) retain its summaries.

# Phases 1–2 evidence — 2026-09-05

The TypeScript structural path is feasible on the scoped corpus. Both-side projection checks
pass in Chromium, the packed package works in the real plugin worker, and nested sparse-edit
cases that defeat the positional shortcut complete while the legacy process reaches its cutoff.
This is evidence to continue TypeScript hardening, not a production performance gate or a
reason to add Rust/WASM.

## Reproduction and measurements

Run `pnpm run bench`. Each sample runs in a fresh Node process with a **2,500 ms hard
termination deadline**, including process startup. Reported `elapsedMs` measures only the
engine call; structural time includes parse, matching, rendering and both-side validation.
Legacy time measures raw htmldiff rendering without equivalent validation. There are three
cold samples for large anchor/sparse cases and one for each small fixture. These are ranges,
not statistically established p95 measurements. No warm-run or main-thread claim is made.

Reference machine: Apple M1 Max, 10 logical CPUs, 64 GiB RAM, macOS arm64; Node 26.7.0.
Dependencies: parse5 8.0.1, jsdiff 9.0.0, Vite 8.2.2, Playwright 1.62.1.
[Recorded JSON](baseline-2026-09-05.json) includes runtime versions, per-side UTF-16 units,
UTF-8 bytes, parsed document-node counts, lexical token counts, phase timings and peak RSS.
Lexical tokens use the fixture generator's Unicode word/whitespace/punctuation regex on raw
HTML; node counts include implied document/head/body nodes. Neither is a legacy tokenizer count.
Raw full outputs regenerate under ignored `bench/results/`; selected legacy outputs are
[retained separately](legacy-examples-2026-09-05.json).

| Fixture                                 | Combined units | Structural elapsed |                       Legacy elapsed |
| --------------------------------------- | -------------: | -----------------: | -----------------------------------: |
| Nested 4,000 paragraphs, sparse edits   |      1,318,038 |     277.4–279.5 ms | 3/3 processes terminated at 2,500 ms |
| Same, plus start insertion              |      1,318,060 |     282.4–288.7 ms | 3/3 processes terminated at 2,500 ms |
| Nested 6,000 paragraphs, insertion only |        777,869 |     139.2–141.4 ms |                         92.6–93.9 ms |
| Flat 6,000 paragraphs, insertion only   |        777,809 |     178.6–184.4 ms |                         92.8–94.8 ms |
| Repeated 6,000 paragraphs               |        252,037 |       81.5–85.6 ms |                         29.8–30.2 ms |
| Legacy transaction guide                |          9,856 |            14.9 ms |                               5.2 ms |

The sparse cases use the licensed legacy generator's paragraph wording and edit cadence,
inside an enclosing section. The plugin's unchanged-top-level-content threshold cannot
partition that section, so raw whole-body legacy execution is the relevant baseline. Prefix
insertion alone is fast in the legacy engine and **does not show an improvement**. The spike
also spends time on parsing and correctness validation that the baseline call does not do.

Peak structural process RSS on the sparse cases is about 191–193 MiB (see exact samples in JSON).
That includes Node and all benchmark-engine imports; it is not incremental engine allocation
or browser worker memory. Input/node/output limits remain provisional. Memory and parser
costs require phase-4 profiling before production release.

## Candidate and parser evaluation

The runner applies `diffWordsWithSpace` to the identical raw bodies, with a 128-edit and
1,000 ms local deadline. It matches simple insertions quickly, but returns `local-limit` for
the sparse cases and transaction guide. This is a sequence feasibility comparison only;
raw HTML token edits are not a valid structural renderer. The engine uses `diffArrays` on
small exact text-node token arrays, with a 512-token cap, 128-edit cap and shared work budget.
Cross-inline mapping and character refinement remain phase-3 work.

parse5 works in the bundled worker without DOM globals. Tests cover implicit tbody insertion,
malformed paragraph repair, attributes containing `>`, SVG, select replacement, empty/void
nodes and whitespace. Chromium independently reparses/projects both sides for all 15 original
fixtures and three licensed legacy documents. Unsupported output is preferable to parser
repair losing content. Template content and changed comments are explicitly declined.

The legacy attribute-only example returns the unmarked after paragraph. The spike marks both
paragraphs and emits a coarse-replacement diagnostic. This intentional correction is visible
in the [reviewed examples](../test/fixtures/VISUAL-REVIEW.md).

## Packed integration

`pnpm run test:integration` packs `redline-engine@0.1.0-spike.1`, copies the actual sibling
plugin frontend into a temporary directory, installs the tarball with a lockfile, changes
only that copy's worker engine adapter, and runs its typecheck and Vite production build.
Chromium then loads the **built plugin worker asset** and checks whole-body requests,
chunked requests and unsupported errors. The observed worker bundle is 180.45 kB
uncompressed, including parse5 and local matching. No engine resources download at runtime.
The original plugin checkout is not modified. The report and tarball are under `artifacts/`.

This proves the packaging/worker seam, not the production viewer integration. The temporary
adapter preserves the old HTML/error response shape; structured diagnostics, marker navigation,
security review, JCEF packaging and the production worker-failure fallback remain phase 5.

## Exit assessment

Phases 1–2 have an executable contract, licensed corpus, reviewed representative redlines,
reproducible isolated baselines, a complete validated structural path, coarse/global-limit
playground demonstrations, real Chromium checks and a packed worker candidate. Continue
with phase 3: broader content-model handling, cross-inline mapping, generated/adversarial
testing and broader serialization repair handling. Phase 4 still needs cold/warm
p95 samples near the viewer guard, startup/transfer/layout measurements and numeric memory
caps. No public release, plugin default switch, or language-performance decision is claimed.

## Review-driven regressions

The [Astra high review](../REVIEW.md) found and prompted fixes for the omitted body parser
context, namespace loss hidden by equal HTML serialization, and eager giant-text tokenization.
The recorded baseline above was rerun after those fixes. The 1,900,014-unit giant-punctuation
case now produces a truthful coarse result in 260.3 ms with 277.0 MiB process peak RSS; the
legacy renderer takes 803.7 ms and 512.0 MiB in this single cold sample. A 300-level nesting
case returns an explicit depth-limit result in 4.0 ms. These add adversarial evidence, not
release-grade memory limits.

The final checks pass: 35 unit tests, 23 Chromium tests, package typecheck/build, playground
production build, formatting, and the rebuilt packed plugin-worker smoke. Astra's initial
review completed; its requested follow-up pass was unavailable due to an account usage limit.

See [the direct sibling comparison](SIBLING-COMPARISON.md) for subsequent measurements on
the actual existing 6,000-paragraph generated files, with a 15-second cutoff and the current
plugin shortcut included.
