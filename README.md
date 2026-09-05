# redline-engine

Structural HTML redlines for Node.js and bundled browser applications. Compare two body
fragments, highlight text and structural edits, and reconstruct either original parsed body
from the merged result. Written in TypeScript; no IDE dependencies, DOM globals or runtime
network calls.

Version **0.1.0** is prepared for its first standalone release. It is not yet published.
The operation model is version 1. The API is ESM-only and ships TypeScript declarations.
Node.js 22+ is the runtime target; the release checks record the exact tested runtime.
Browser use requires a bundler capable of resolving npm ESM dependencies.

## Install and compare

Until publication, install the checked tarball:

```sh
npm install /path/to/redline-engine-0.1.0.tgz
# Once published: npm install redline-engine
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
retain the comparison in the worker if you need its public `project` function. Worker failures
are explicit; do not retry pathological inputs synchronously or with a legacy diff engine.

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

The acceptance suite passes 317 active checks with independent Chromium reconstruction and
highlight assertions. On an Apple M1 Max, Stage 3 small-workload warm render-ready p95 was at
most 22.9 ms; the actual near-input-guard sibling documents were below 0.6 seconds. A synthetic
70,000-replacement case expanded to 7.8 MB and took **2.403 seconds p95**, missing the original
provisional 2-second target. This result is accepted for the initial standalone release and
remains recorded as a benchmark failure, not relabelled as a pass. Extreme expansion is memory
intensive; use one active comparison worker per view and release results/views you no longer need.

Malformed namespace-changing repairs can return `unsupported`. Local refinement is bounded;
coarse replacements are explicitly diagnosed and preserve both sides. Browser appearance,
hidden content and duplicate IDs remain host concerns. Chromium evidence is not packaged JCEF
validation. Extension integration is a separate project and milestone.

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

Ordinary builds, acceptance and standalone package checks require no sibling checkout.
`test:package` installs the tarball in a temporary consumer, checks both TypeScript resolution
modes and runs Node/browser-worker consumers. The optional `bench:sibling` and `test:integration`
commands require the sibling extension; they are not standalone release prerequisites.
`bench:stage3` retains the original strict performance target and currently exits 1 for the
accepted extreme-case miss. Release decisions and reproducible evidence live in the repository's
`release/` and `bench/` directories; [COMPATIBILITY.md](COMPATIBILITY.md) records behavior.

MIT — [LICENSE](LICENSE). [THIRD-PARTY-NOTICES.md](THIRD-PARTY-NOTICES.md) describes runtime
dependencies and the separately retained test/benchmark provenance. The old engine and its
fixtures are excluded from the npm package.
