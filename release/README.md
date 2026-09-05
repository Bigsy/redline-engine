# Standalone 0.1.0 release preparation

The package is prepared for publication as **redline-engine@0.1.0**, ESM-only, MIT. It has
not been published. The user explicitly chose a standalone milestone, with extension integration
in the other project in a separate session. No extension files were changed.

## Release decision

The measured extreme-output result (7,817,788 units, 70,000 replacements, 2.403 seconds warm
Chromium p95) is accepted for this initial release. The original 2-second benchmark and
`bench/stage3-gate.json` still fail; neither the workload nor its assertions were changed.
This is an explicit release decision, not a new performance claim. Every preservation,
precision, custom-prefix and formatting-shell acceptance assertion remains active.

The previous roughly 3.9 GiB browser RSS observation was from a long multi-workload benchmark
session and was not per-comparison memory. `pnpm run bench:memory` now performs one unchanged
extreme comparison in each of three fresh Chromium processes:

| Snapshot                                                         | Summed browser RSS range |
| ---------------------------------------------------------------- | -----------------------: |
| Blank page                                                       |              236–247 MiB |
| Full comparison response, worker alive                           |              674–675 MiB |
| Extreme merged frame laid out                                    |          1,472–1,520 MiB |
| Worker terminated, result/frame released, main-page GC requested |              657–660 MiB |

Measured main-page JS heap falls from about 25–29 MiB to 0.62 MiB after cleanup; reported
embedder heap falls from roughly 676–678 MiB to 0.29 MiB. RSS does not immediately return to the
blank baseline. These observations demonstrate reclaimed measured heaps, not proof that every
allocation is released or that RSS will shrink. The result is memory intensive mainly once
laid out. Consumers should avoid retaining large journals/obsolete frames and run one active
comparison per view; the shipped worker example terminates after each result and transports
only HTML, diagnostics and timings. Hosts still own memory-pressure policy.

[Raw memory results](../bench/release-memory-results.json): Apple M1 Max, 64 GiB RAM,
Chromium 151.0.7922.34, three fresh browser processes. CDP process IDs plus `ps` RSS snapshots
can double-count shared pages and are not peak sampling. The post-cleanup forced GC is for
measurement only; production must not depend on it. No performance threshold was derived from
this instrumented run and no packaged JCEF behavior was tested.

## Artifact and reproducible validation

Run `pnpm run test:package`. It packs with the prepack clean build, installs in a temporary
consumer using npm with install scripts disabled, then verifies:

- An explicit package-content allowlist, root MIT license and third-party notices.
- Strict TypeScript NodeNext and Bundler resolution, `skipLibCheck: false`, no DOM type library.
- Public Node ESM API, both formatting-shell projections, invalid options and bounded failure.
- A Node worker consumer and the shipped basic example.
- Production Vite build of the shipped browser host/worker examples.
- Chromium worker output, independent projections, meaningful `brown` highlighting,
  cancellation and the minimal transport shape.

`release/package-check.json` records the exact tarball filename, integrity, SHA-256, file list,
installed runtime dependencies and tested tool versions. Runtime target is Node 22+; the checked
runtime version is explicit in that snapshot, not a claim to have tested every supported version.
There are no IDE dependencies or runtime network calls. Runtime dependencies are not bundled;
their distributions carry their licenses. The old engine, fixtures, playground, benchmarks,
release tooling and tests are excluded from the package. Source maps embed engine sources;
declaration maps pointing at absent source files are not shipped.

Functional release checks: typecheck, unit, upstream, compatibility, browser, format and build.
The existing strict Stage 3 performance command intentionally remains separate and nonzero for
the accepted limitation. No sibling checkout is needed for standalone acceptance or package tests.
The package test requires npm registry access to install normal dependencies and an installed
Playwright Chromium. A fresh package build requires the repository's dev dependencies.

## Publication handoff

The npm registry query for `redline-engine` returned 404 during preparation; this is not a
reservation or guarantee of publish permission. The tested tarball was prepared before a repository remote existed, so it omits
repository/homepage metadata. Source is now hosted at https://github.com/Bigsy/redline-engine
(private); repository metadata can be added in a subsequent package release. Publication still needs the intended npm
account and its normal authentication/2FA. Review the artifact named in `package-check.json`
and publish that exact tarball, rather than rebuilding unreviewed files:

```sh
npm publish ./artifacts/redline-engine-0.1.0.tgz --access public
```

Publishing is a separate external action and has not been performed. After publication, record
registry integrity/version, update the unpublished status in docs for the next patch, and let
the extension consume an exact released version with lockfile integrity in its own session.

## Recorded validation

Final tarball checks passed on v26.7.0 and v22.23.2, TypeScript 5.9.3,
and Chromium 151.0.7922.34. Acceptance: 317/317; upstream: 87/87; unit: 40/40; browser:
25/25; zero skips. Typecheck and formatting pass. See [checks.json](checks.json) and
[package-check.json](package-check.json). The packed archive is 48,258 bytes
(186,184 bytes unpacked).
