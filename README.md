# redline-engine

Structural HTML redlines for Node.js and bundled browser applications. Compare two body
fragments, highlight text and structural edits, and reconstruct either original parsed body
from the merged result. Written in TypeScript, with no runtime DOM globals or network calls.

ESM-only, with TypeScript declarations. Requires Node.js 22+ or a browser bundler.

## Why use it over node-htmldiff?

`redline-engine` is a structural alternative to **node-htmldiff 0.9.4**. It aligns HTML
subtrees and refines local text changes, making large documents with scattered edits practical
while validating that both original parsed bodies can be reconstructed.

On synthetic documents with **6,000 paragraphs per side, about 1 MB each**, the recorded
comparison was:

| Sparse-edit workload                  | redline-engine | node-htmldiff 0.9.4 |
| ------------------------------------- | -------------: | ------------------: |
| Original pair                         |         433 ms |   Timed out at 15 s |
| Both bodies enclosed in a section     |         465 ms |   Timed out at 15 s |
| Extra paragraph inserted at the start |         447 ms |   Timed out at 15 s |

Measured on an Apple M1 Max with Node.js 26.7.0. New-engine values are medians of three
fresh-process calls, including parsing, matching, rendering and both-side validation.
The raw legacy renderer was run once per workload and terminated at 15 seconds, including
process startup; its eventual completion time is unknown. See the
[recorded samples](bench/sibling-results-2026-09-05.json).

The gain is workload-dependent: simple insertion-only and repetitive cases were faster in
node-htmldiff in the [baseline benchmarks](bench/REPORT.md). This is a replacement API,
not a drop-in adapter.

Beyond performance, the engine represents attribute-only changes and preserves whitespace,
comments, empty elements and namespaces. Successful results pass reconstruction checks;
unsupported inputs and exceeded budgets produce explicit outcomes. The
[compatibility suite](COMPATIBILITY.md) has 317 passing checks covering adapted upstream
behavior, intentional corrections and additional cases.

## Install and compare

Install the published release:

```sh
npm install redline-engine@0.1.0
```

```ts
import { compareBodies, project, renderMerged } from "redline-engine";

const result = compareBodies({
  beforeHtml: "<p>Hello <b>old</b> world.</p>",
  afterHtml: "<p>Hello <b>new</b> world.</p>",
});

if (result.outcome === "success") {
  const { html, diagnostics } = renderMerged(result.comparison);
  const beforeBody = project(result.comparison, "before");
  const afterBody = project(result.comparison, "after");
  console.log(html, beforeBody, afterBody, diagnostics);
} else if (result.outcome === "limit") {
  console.error("Comparison exceeded", result.limit);
} else {
  console.error("Cannot represent this comparison", result.diagnostics);
}
```

Success is returned only after both projections of **reparsed merged HTML** match the
canonical input DOM trees, including namespaces, attributes, comments, whitespace and empty
nodes. Source bytes, attribute order and equivalent entity spellings may normalize. Moves
are represented as deletion/insertion. Unsupported and limit results contain no partial HTML.

## Public API

| Export                                     | Purpose                                                                |
| ------------------------------------------ | ---------------------------------------------------------------------- |
| `compareBodies(input)`                     | Synchronous comparison returning `success`, `unsupported` or `limit`.  |
| `renderMerged(comparison)`                 | Returns `{ html, diagnostics }` from the validated comparison.         |
| `project(comparison, "before" \| "after")` | Reconstructs a canonical body string using owned markers.              |
| `DEFAULT_LIMITS`                           | Default input, node, depth, work, output and cooperative time budgets. |
| `MODEL_VERSION`                            | Operation model version, currently `1`.                                |

Types: `CompareBodiesInput`, `ComparisonResult`, `Comparison`, `Operation`, `Diagnostic`,
`Limits`, `Side` and `Timings`. Import through `redline-engine`; internal module paths are not
public API. Do not mutate comparison objects. During 0.x, incompatible API/marker changes
will require a minor version; fixes preserving the contract use patch versions.

Options are optional: `className` (default `redline`), `dataPrefix` (default `diff`),
`atomicTags` (additional exact lowercase atomic element names), and partial `limits`.
Invalid option values return `unsupported`. See [CONTRACT.md](CONTRACT.md) for grammars,
precision boundaries, operation semantics and supported HTML content models.

## Worker and display boundary

**This library is not a sanitizer.** Sanitize both bodies before comparison and isolate the
rendered result. The host owns document heads, resource loading, security policy and styling.
Run user-supplied documents in a worker and terminate it after 15 seconds or cancellation:
the synchronous parser cannot be preempted by the cooperative engine timeout.

[Browser host](examples/browser-host.mjs) and [worker](examples/browser-worker.mjs) examples
show a bundler-based worker with a deadline and cancellation. Copy both files into your
application. The worker sends HTML, diagnostics and timings rather than the operation journal;
retain the comparison in the worker if you need its public `project` function. Handle worker failures and cancellation in your application.

Default generated markers use `data-diff-node="insert|delete"`, `data-diff-op` and optional
`data-diff-wrapper`. Cross-inline formatting shells use `data-diff-unwrap="before|after"`.
All `data-diff-*` input attributes are reserved and cause rejection; a custom prefix owns its
corresponding namespace. Original `ins`/`del` elements are not generated markers merely because
of their tag or class. Custom viewers must implement all marker semantics in the contract.

```css
ins.redline,
[data-diff-node="insert"] {
  background: #dcfce7;
}
del.redline,
[data-diff-node="delete"] {
  background: #fee2e2;
}
[data-diff-unwrap] {
  outline: 1px dashed #956600;
}
```

## Bounds and measured limitations

Defaults: **2,000,000 combined UTF-16 input units; 200,000 nodes per side; depth 256;
50,000,000 work units; 8,000,000 output units; 15,000 ms cooperative time**. These budgets
interact: passing the input or node cap does not guarantee that work/output budgets fit.
They do not impose a process memory ceiling or bound host layout.

On the measured Apple M1 Max, small-workload warm Chromium render-ready p95 was at most
22.9 ms. A synthetic 70,000-replacement case expanded to 7.8 million output units and took
**2.403 seconds p95**, exceeding the benchmark's 2-second target. Extreme expansion is memory
intensive. See [performance measurements](bench/STAGE3.md) for workloads, timing boundaries
and memory observations.

Malformed namespace-changing repairs can return `unsupported`. Bounded local refinement may
produce diagnosed coarse replacements that preserve both sides. Document styling, hidden
content and duplicate IDs remain application concerns.

## Develop and verify

```sh
pnpm install --frozen-lockfile
pnpm exec playwright install chromium
pnpm run typecheck
pnpm run test
pnpm run test:upstream
pnpm run test:compatibility
pnpm run test:browser
pnpm run test:package
pnpm run playground
pnpm pack --pack-destination artifacts
```

`test:package` installs the tarball in a temporary consumer, checks TypeScript resolution
and runs Node and browser-worker examples. `pnpm run bench` runs the isolated comparison
benchmarks. [CONTRACT.md](CONTRACT.md) specifies the API and preservation guarantees.

MIT — [LICENSE](LICENSE). [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) describes runtime
dependencies and the separately retained test/benchmark provenance. The old engine and its
fixtures are excluded from the npm package.
