# Fixture provenance and expectations

`cases.ts` contains original MIT-licensed synthetic bodies covering word changes, nested
insertions, repetition, lists/tables, attributes, empty/void elements, formatting,
Unicode/entities, whitespace, malformed input, select and foreign-content replacement.
`structural()` generates start insertions; `sparse()` adapts the legacy large generator.

`legacy/mock/` and `legacy/generate.mjs` were copied from the sibling Redline plugin at
commit `484e6aaef6d74e4725e876eda633b6036b5b3000` (2026-09-05), paths `testdata/mock/`
and `testdata/large/generate.mjs`. These are fictional Examplecare documents, not customer
content. The original MIT notice is retained in `legacy/LICENSE`; assets are retained for
provenance but previews block external resources. The adapted sparse generator retains
the original paragraph wording and edit cadence, adding wrappers and an optional insertion.

The original patched node-htmldiff 0.9.4 is retained under `bench/vendor/`, with its
upstream MIT license and local patch notice. It is benchmark-only and never bundled into
the engine. Its outputs are comparison evidence, not expected correct output.

Both the happy-dom suite and Chromium independently project the rendered markers and
compare against separately parsed originals. Chromium also exercises all three legacy
bodies. Representation checks do not establish original appearance under arbitrary CSS.

## Upstream acceptance evidence

`upstream/node-htmldiff-0.9.4/` contains the unchanged pinned published package. See
`upstream/PROVENANCE.md` for integrity and license details, and `../../COMPATIBILITY.md`
for the source matrix. Adapted pairs live in `../compatibility/upstream.json`; sibling
regressions reuse the existing `legacy/mock` corpus. The separate acceptance command
keeps precision and option failures visible without changing the originals.
