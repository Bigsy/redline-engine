# redline-engine

A standalone structural HTML redline engine: it compares two sanitized document
bodies, aligns them structurally, and renders a truthful merged redline.

Status: **scaffold**. No engine exists yet — `compareBodies` returns an explicit
`unsupported` outcome. `PLAN.md` is the architecture review and build plan; read
it first.

The first consumer is the [Redline IntelliJ plugin](../redline), which keeps
sanitization, CSP, worker lifetime, and all UI concerns. This library owns
parsing into its own model, matching, operations, rendering, and projection
validation. It has no IDE dependencies and makes no network calls, and **it is
not a sanitizer** — hosts must sanitize inputs and isolate output, including the
playground.

## Layout

```text
src/model/    normalized tree, correspondences, operations, diagnostics
src/parse/    parser adapter and serialization
src/match/    subtree anchors, sibling alignment, bounded inline diff
src/render/   merged HTML and before/after projections
test/         correctness suite and fixtures
bench/        generators, isolated runners, recorded results
playground/   before / redline / after, diagnostics, timings
```

## Commands

```sh
pnpm install
pnpm run typecheck
pnpm run test
pnpm run playground
pnpm run build
```

## API sketch

```ts
compareBodies({ beforeHtml, afterHtml, limits }): ComparisonResult
renderMerged(comparison): { html, diagnostics }
project(comparison, "before" | "after"): string
```

Outcomes are discriminated: `success`, `unsupported`, or `limit`. Successful
results carry a versioned operation model plus diagnostics identifying any
coarse replacements. Types are provisional until phase 1 fixes the contract.

## License

MIT — see `LICENSE`.
