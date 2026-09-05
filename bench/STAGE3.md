# Subsequent standalone release decision

The user accepted the documented 2.403-second extreme-case latency for standalone 0.1.0.
The historical strict gate below and its raw failure snapshot remain unchanged. See
[release preparation](../release/README.md) and [fresh-process memory](release-memory-results.json).
Extension integration is deferred to a separate project/session; this does not claim JCEF validation.

# Stage 3 performance and bounds gate — 2026-09-05

**Assessment complete; resource gate fails. Do not start Stage 4.** The original small-corpus
250 ms p95 target passes, and the actual sibling near-input-guard files pass 2 seconds in
Chromium. The supported near-output-guard expansion fails 2 seconds render-ready. Memory is
substantial and a production host memory ceiling remains unresolved. No workload was dropped
to make the target pass, and no acceptance assertion was disabled.

## Reproduce and interpret

Run `pnpm run bench`, `pnpm run bench:sibling`, then `pnpm run bench:stage3`.
The gate also requires the declared outcome and all 45 Node/Chromium samples for each of
60 workloads; turning a supported case into an arbitrary limit cannot remove its failure.
The last command intentionally exits **1** when the provisional targets fail; it writes
[stage3-gate.json](stage3-gate.json). There are no expected failures or skips in acceptance.
The historical pre-optimization snapshot is read for comparison, never overwritten by that
command. The supplied Stage 3 commands use the installed Node 26 TypeScript stripping for
fixture imports. `PLUGIN_ROOT` remains supported by the original sibling comparison harness.

This workspace's pnpm automatic dependency verification requested a modules-directory purge
after the exact parser pin. It was not performed: checks used
`pnpm --config.verify-deps-before-run=false run <command>` against the already installed
parse5 8.0.1. The lockfile importer was updated offline, and its resolved version is unchanged.
Chromium required execution outside the filesystem sandbox to register macOS Mach ports.
Neither adjustment changes engine behavior or disables an assertion.

Machine: Apple M1 Max, 10 logical CPUs, 64 GiB physical RAM, Darwin 25.6.0 arm64;
Node 26.7.0; parse5 8.0.1; diff 9.0.0; Playwright 1.62.1. Exact Chromium version and raw
measurements are in [stage3-summary.json](stage3-summary.json). No CPU throttling, memory
pressure simulation, packaged JCEF, or customer documents were used.

- Node: three fresh-process first-call samples per fixture, then a separate process with one
  warmup and 20 measured warm calls. Parent watchdog is rearmed after each completed call.
  Call time includes parse/inspection, alignment, rendering and two original-tree projection
  validations. Cold process wall time additionally includes module loading/IPC. A tiny IPC
  heartbeat is included in recorded call time. Peak RSS is process-lifetime high water;
  before/after JS heap samples are **not** peak heap. No forced GC or outlier trimming.
- Chromium: one fresh worker first call and 20 warm calls per fixture, full operation journal
  included in the response, module loading from local Vite source. Worker startup-to-ready,
  two-way input echo cloning, engine call, result round trip, and their residual are separate.
  This measures the current full journal seam, not a hypothetical HTML-only transport.
- Layout: a sandboxed iframe with resource-blocking CSP, fixed 1050×800 viewport, system font
  and simple marker styles. `srcdoc` assignment to load, forced `offsetHeight`, then two
  animation frames defines render-ready. `frameReadyMs` includes HTML parsing, style/layout
  and scheduling; the isolated forced-layout duration may be nearly zero when load already
  flushed layout. This is real Chromium layout, not a guarantee that all offscreen pixels
  were painted. Host sanitizer, viewer navigation/minimap, original document CSS and JCEF
  are excluded. Before/after original views are not simultaneously laid out.
- Both projections of the first successful sample of **every** Chromium fixture are compared
  using independent browser DOM tuples, including namespaces and template content. Synthetic
  density/start/wrapper cases also require exact `Original`/`Changed` word highlights.
  These checks run outside the measured pipeline. Existing compatibility precision and
  custom-prefix/formatting-shell assertions run separately and remain active.
- Chromium memory: `performance.memory` is quantized (often 10 MB) and is not used as a peak
  claim. After each fixture, CDP process IDs and `ps` yield summed RSS across browser processes.
  This is a snapshot after worker termination, may retain allocator/GC memory from earlier
  fixtures, and may double-count shared pages. It is neither peak nor per-comparison ownership.
- Percentiles are nearest-rank, separately per workload, with 20 warm samples (p95 is the
  19th ordered sample). Three Node cold samples and one browser cold sample do **not** establish
  a cold p95 or a statistically reliable tail. Raw outliers and failures are retained. The
  first browser pass overlapped part of the sibling baseline; the final browser pass was
  sequential with the engine benchmarks and is the reported gate result. Machine background
  activity and caches were not controlled. These are machine-specific observations, not an SLA.

## Measured bottleneck and TypeScript changes

Stock parse5 8.0.1 finalizes a fragment through `_adoptNodes`: detach the first child using
`splice(0, 1)`, then append it, repeatedly. Wide fragment adoption is quadratic. The 20,000
formatting-element rewrite took roughly 1.64 s cold (about 0.57 s parse and 1.00 s validation);
70,000-element expansion and 199,999-node deletion hit the parent 15-second cutoff.
See [stage3-before-results.json](stage3-before-results.json).

`BodyParser` now bulk-moves the donor's children with a linear parent-link update, using the
same default adapter and parsing algorithm. The parser dependency is pinned because this is
an internal extension point. Differential tests compare stock and optimized parsers, including
wide fragments, adoption-agency repair, foster parenting, malformed formatting and templates;
all existing independent Chromium tests remain required. No tokenizer, matching or highlight
rule changed. The 70,000-element expansion now succeeds in roughly 1.2 seconds in Node;
its remaining browser layout/transfer cost still makes the render-ready gate fail.

Output chunks now reserve their length while constructing the render plan. Previously an
oversized plan and all operation payloads were retained until final assembly rejected it.
The reservation stops further plan construction; one current serialized fragment/operation
may already be allocated. Exact-budget and one-unit-under tests protect the accounting, and
an output-versus-work regression demonstrates earlier failure without partial HTML.

## Bounds decision

Retain the original caps; do not shrink the benchmark workload to pass a latency target.

| Resource | Cap | Evidence and limitation |
| --- | ---: | --- |
| Combined input | 2,000,000 UTF-16 units | Exact identity boundary succeeds; 2,000,001 rejects before parsing; sibling variants use about 1,981,000. |
| Canonical nodes | 200,000 per side | 200,000-node identity passes node inspection but reaches maxWork; 200,001 rejects on maxNodes. 199,999-node deletion reaches maxOutputUnits. Inspection follows parsing. |
| Depth | 256 including leaves | 255 divs plus text succeeds; 256 plus text and 300/10,000 divs reject. Cannot raise this ceiling. |
| Abstract work | 50,000,000 | Dense/sparse/repeated matrices exercise the default; low-work and dense 1,000,000-budget cases reject explicitly. Units are algorithmic reservations, not milliseconds or CPU instructions. |
| Merged output | 8,000,000 UTF-16 units | 7,817,788-unit expansion succeeds with truthful projections; 80,000-element expansion rejects. Exact and one-unit-below custom output budgets tested. |
| Cooperative time | 15,000 ms | Zero-time rejects; the synchronous parser can block checkpoints. Hard host termination remains mandatory. |

An 80,000-level tree per side fits 1,760,002 input units but is still inside parsing when the
parent terminates it after approximately 15,003 ms. The actual playground watchdog is tested
with a noncooperative worker at the real 15-second deadline, followed by cancel/restart.
Timer scheduling means a few milliseconds of overshoot; no exact wall-clock deadline can be
promised if the host event loop is blocked. See [stress](stage3-stress-results.json) and
[watchdog](stage3-watchdog-results.json) snapshots.

The envelope guarantees neither success for every under-input-cap string nor an enforceable
memory ceiling. The largest warm expansion reaches about 1.4 GiB Node peak RSS and roughly
3.9 GiB summed browser RSS after the fixture. A numeric production memory cap cannot honestly
be inferred from those measurements or enforced by this synchronous browser API. These observed
costs and the absent host memory policy are release blockers, not a reason to declare a smaller
unmeasured safe workload. No Rust/WASM, IDE dependency, runtime network call, development switch
or plugin replacement was introduced.

## Final distributions

The following table includes all sizes/densities, rejection cases, original fixtures, actual
sibling files and boundary probes. Warm Chromium values for rejection cases measure receipt
of the limit result, with no merged frame. Raw sources:
[Node](stage3-node-results.json), [Node boundaries/originals](stage3-node-extra-results.json),
[Chromium](stage3-browser-results.json), [Chromium boundaries/originals](stage3-browser-extra-results.json).

| Case | Units | Outcome | Node warm p95 ms | Chromium warm p95 render-ready ms | Cold Chromium ms | Peak Node RSS MiB |
| --- | ---: | --- | ---: | ---: | ---: | ---: |
| edits-20-0.02 | 3819 | success | 1.7 | 15.3 | 64.7 | 79.5 |
| start-20 | 3841 | success | 1.6 | 14.9 | 41.4 | 78.8 |
| wrapper-20 | 3857 | success | 2.0 | 14.9 | 43.2 | 78.8 |
| edits-20-0.5 | 3810 | success | 2.5 | 15.6 | 43.3 | 77.5 |
| edits-20-1 | 3800 | success | 3.1 | 15.7 | 42.3 | 77.7 |
| repeated-20 | 855 | success | 1.0 | 15.7 | 36.1 | 74.3 |
| edits-700-0.02 | 135566 | success | 25.4 | 47.2 | 73.9 | 155.2 |
| start-700 | 135588 | success | 25.5 | 45.5 | 71.7 | 157.2 |
| wrapper-700 | 135604 | success | 27.0 | 45.9 | 76.9 | 156.9 |
| edits-700-0.5 | 135230 | success | 52.4 | 75.3 | 104.7 | 179.9 |
| edits-700-1 | 134880 | success | 63.4 | 98.5 | 129.9 | 192.5 |
| repeated-700 | 29415 | success | 8.2 | 23.4 | 48.5 | 114.0 |
| edits-5800-0.02 | 1134464 | success | 174.8 | 280.5 | 332.7 | 300.4 |
| start-5800 | 1134486 | success | 182.6 | 277.6 | 335.0 | 337.4 |
| wrapper-5800 | 1134502 | success | 183.9 | 279.0 | 332.2 | 322.0 |
| edits-5800-0.5 | 1131680 | success | 343.6 | 527.6 | 550.1 | 360.2 |
| edits-5800-1 | 1128780 | success | 489.8 | 704.6 | 756.7 | 409.7 |
| repeated-5800 | 243615 | success | 53.2 | 88.8 | 123.1 | 247.9 |
| giant-1000 | 2014 | success | 0.8 | 15.3 | 34.6 | 69.1 |
| giant-100000 | 200014 | success | 18.5 | 48.7 | 72.0 | 144.8 |
| giant-950000 | 1900014 | success | 256.6 | 464.1 | 526.0 | 486.7 |
| depth-64 | 1410 | success | 1.3 | 15.3 | 38.6 | 77.6 |
| depth-255 | 5612 | success | 5.1 | 15.0 | 43.1 | 86.9 |
| depth-256 | 5634 | maxDepth | 1.3 | 0.8 | 19.9 | 71.9 |
| depth-300 | 6602 | maxDepth | 1.7 | 1.3 | 19.7 | 70.9 |
| depth-10000 | 220002 | maxDepth | 902.0 | 392.7 | 404.1 | 138.1 |
| expansion-1000 | 16000 | success | 18.7 | 39.0 | 72.4 | 178.8 |
| expansion-20000 | 320000 | success | 326.7 | 574.8 | 606.4 | 532.7 |
| expansion-70000 | 1120000 | success | 1172.6 | 2402.6 | 2390.2 | 1431.7 |
| nodes-near | 799996 | maxOutputUnits | 262.4 | 279.0 | 272.8 | 726.1 |
| nodes-over | 800004 | maxNodes | 148.5 | 175.1 | 195.7 | 369.6 |
| input-over | 2000001 | maxInputUnits | 0.0 | 0.8 | 16.9 | 72.5 |
| work-low | 20 | maxWork | 0.1 | 0.2 | 17.4 | 65.7 |
| output-low | 20 | maxOutputUnits | 0.2 | 0.2 | 18.6 | 66.0 |
| deadline-zero | 20 | timeoutMs | 0.0 | 1.2 | 15.1 | 65.2 |
| corpus-collection-guide | 3088 | success | 1.3 | 15.2 | 37.9 | 74.5 |
| corpus-transaction-guide | 9856 | success | 3.8 | 22.9 | 41.0 | 90.6 |
| corpus-welcome-pack | 2768 | success | 1.8 | 14.8 | 33.9 | 73.7 |
| sibling-original | 1981444 | success | 373.7 | 555.4 | 622.3 | 387.7 |
| sibling-wrapper | 1981482 | success | 380.6 | 577.5 | 637.6 | 460.7 |
| sibling-start | 1981466 | success | 385.7 | 556.6 | 630.1 | 387.9 |
| fixture-words | 46 | success | 0.5 | 15.4 | 62.5 | 93.8 |
| fixture-nested insertion | 104 | success | 0.5 | 14.9 | 34.8 | 92.3 |
| fixture-repetition | 62 | success | 0.4 | 15.1 | 34.9 | 92.5 |
| fixture-list | 58 | success | 0.5 | 15.3 | 35.5 | 94.0 |
| fixture-table | 115 | success | 0.6 | 15.2 | 35.9 | 93.4 |
| fixture-attributes | 58 | success | 0.5 | 15.1 | 35.5 | 91.9 |
| fixture-attribute text shell | 44 | success | 0.4 | 15.4 | 36.8 | 92.1 |
| fixture-void and empty | 91 | success | 0.5 | 15.1 | 36.1 | 92.5 |
| fixture-formatting | 72 | success | 0.7 | 15.0 | 35.3 | 96.9 |
| fixture-unicode entities | 64 | success | 0.6 | 15.4 | 40.3 | 94.7 |
| fixture-whitespace | 72 | success | 0.7 | 15.2 | 35.1 | 93.0 |
| fixture-malformed | 16 | success | 1.0 | 15.5 | 35.6 | 92.5 |
| fixture-select | 79 | success | 0.4 | 14.9 | 35.6 | 91.8 |
| fixture-foreign | 92 | success | 0.4 | 15.7 | 34.5 | 92.4 |
| fixture-unrelated | 71 | success | 0.5 | 15.1 | 35.2 | 94.3 |
| nodes-exact-identity | 1600000 | maxWork | 775.4 | 951.5 | 988.7 | 898.4 |
| expansion-over | 1280000 | maxOutputUnits | 426.1 | 442.9 | 450.6 | 823.4 |
| work-bounded-dense | 1245000 | maxWork | 62.8 | 56.8 | 84.4 | 320.9 |
| input-exact-identity | 2000000 | success | 146.3 | 218.7 | 264.8 | 408.6 |


## Gate outcome and regression checks

All 24 defined small workloads have warm Chromium p95 below 250 ms (worst about 22.9 ms).
The three real sibling variants have warm render-ready p95 below 0.6 seconds. The 70,000-
element, 7,817,788-unit output expansion has warm p95 **2,402.6 ms**, cold **2,390.2 ms**:
**fail**, against the unchanged 2,000 ms target. `bench:stage3` reports it and exits 1.
The original input guard stays 2,000,000; the output guard stays 8,000,000. All 60 workloads,
including limit outcomes, remain visible. Exact-node identity exhausting maxWork is not
reclassified as success. No arbitrary whole-body replacement was introduced.

Final functional checks: acceptance **317/317**, upstream **87/87**, unit **40/40**, browser/
playground **25/25**, all with zero skips. Typecheck, package/playground builds and formatting
also pass. The browser count includes a real-clock watchdog test. Acceptance result snapshots
were regenerated; stock upstream fixture assertions were untouched. The isolated legacy and
actual sibling baselines were rerun. Stage 4 integration and packaged JCEF were not attempted.

Remaining work before release/integration: resolve the near-output-limit render-ready failure,
establish a host memory policy under pressure, and run real packaged JCEF validation at the
appropriate integration stage. The present evidence supports the scoped TypeScript improvement;
it does not justify introducing Rust/WASM or weakening preservation/highlight assertions.

## Separate browser costs

Chromium 151.0.7922.34. All values are milliseconds; per-column p95 values must not be summed.

| Case | Cold startup | Warm engine p95 | Input echo p95 | Result transport residual p95 | Forced layout p95 | Frame-ready p95 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| corpus-transaction-guide | 15.9 | 3.6 | 0.3 | 0.3 | 1.4 | 19.0 |
| edits-5800-1 | 16.7 | 543.7 | 5.7 | 16.9 | 29.3 | 146.6 |
| sibling-original | 15.3 | 396.3 | 6.1 | 7.8 | 24.1 | 161.0 |
| expansion-70000 | 16.0 | 1157.4 | 7.8 | 52.5 | 226.9 | 1248.9 |
