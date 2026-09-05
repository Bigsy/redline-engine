# Engine contract — model version 1

`compareBodies({beforeHtml, afterHtml, limits?, className?, dataPrefix?, atomicTags?})` compares sanitized HTML **body fragments**.
A host must sanitize before comparison and isolate the resulting HTML. The engine never
fetches resources, sanitizes HTML, handles document heads, or accesses IDE/DOM APIs.
The default parse5 body context defines canonical inputs; source bytes are not preserved.

A success contains a validated merged string, ordered operation journal, diagnostics and
stage timings. `renderMerged` returns that already validated string. `project` independently
reparses that string and reconstructs the requested side. Do not mutate a comparison.
Unsupported and limit results contain no partial HTML. Hosts must show an explicit fallback
and must not automatically retry pathological inputs with the legacy engine.

## Preservation and markers

Before success, both projections of **reparsed merged HTML** must equal the canonical
parsed input trees, including text, attributes, namespaces, whitespace, empty/void elements
and comments. Fingerprint equality is always followed by structural equality. Parser repairs
that prevent reconstruction produce `unsupported-representation`, never apparent equality.
Source formatting, attribute order and character-reference spelling are outside this contract.
Validation compares DOM tuples, not serialized HTML: equal serialization can hide namespace
changes caused by parsing MathML integration points. Adjacent projected text nodes are merged.

Generated text/comment changes use `ins.redline` and `del.redline` by default. Content insertion/deletion markers have:

- `data-diff-node="insert"` or `"delete"`;
- `data-diff-op="op-N"`, unique within one comparison;
- `data-diff-wrapper=""` only on generated inline wrappers that projections must unwrap.

Structural changes mark the actual element (e.g. `tr`, `td`, `li`, `select`, `svg`), without
placing arbitrary wrappers around it. With the default prefix, input containing any `data-diff-*` attribute is
unsupported, including attributes inside unchanged subtrees and template content; the active
namespace belongs to the engine. Original classes, including `redline`, are preserved and are not projection metadata.
The host must account for this namespace in its marker-spoofing protections before integration.

Formatting shells around shared text carry `data-diff-unwrap="before|after"` and
`data-diff-op`, without `data-diff-node`. Projection unwraps that shell only on the named
side; it retains the element on the other side. This lets a word stay unmarked while its
formatting changes. Nested shells may encode overlapping before/after formatting ranges;
all are validated by reparsing. Hosts must recognize both `node` and `unwrap` markers for
navigation/formatting annotations, and strip all owned metadata on projection. Generated
content wrappers always unwrap on their retained side. Original `ins`/`del` elements are
never identified by tag or class alone. Projection processes descendants before unwrapping.

### Options

- `className`: default `redline`; one nonempty identifier matching
  `[a-zA-Z_][a-zA-Z0-9_-]*`. Applies to generated `ins`/`del` wrappers, not original elements.
  Multiple classes, punctuation outside this grammar and nonstrings are unsupported.
- `dataPrefix`: default `diff`; matches `[a-z][a-z0-9]*(?:-[a-z0-9]+)*`.
  All generated metadata uses `data-${dataPrefix}-*`; the entire selected prefix is reserved.
  Other prefixes are ordinary input attributes and survive projection. A successful comparison
  records `dataPrefix`; `project(comparison, side)` uses it automatically. An omitted field in
  an older model-1 comparison defaults to `diff`.
- `atomicTags`: default `[]`; an array of exact lowercase names matching the same grammar
  as `dataPrefix`. Duplicates are harmless. These names add atomic boundaries to the safe
  default behavior; they do not enable descent into raw text, foreign, unknown or restricted
  controls. `b` does not match `blockquote`, and `video` does not match `video-js`.

Invalid options (including explicit nulls) return `unsupported-representation` even on
identity input. No option is silently ignored. No legacy callable facade or module loader
is introduced.

Operations are a preorder journal with `id`, optional `parentId`, `kind`, `beforeHtml` and
`afterHtml`. Container entries establish parentage and have empty fragment payloads; leaf
entries carry their local serialized content. A replacement shares one ID across its marked
before and after elements. IDs restart on every call; hosts combining multiple comparisons
must scope them. This is an inspection model, not a portable standalone patch format.

## Supported precision

Paragraphs, nested sections/divs, ordinary inline containers, simple lists and tables are
aligned structurally. Compatible text nodes get bounded word/punctuation diffs, preserving
Unicode code points and whitespace. Root-level plain text is refined without adding a paragraph.
Bounded inline streams map words and atomic leaves across formatting nodes, retaining original
ancestry. Adjacent compatible token edits coalesce into spans. Parser-discarded tags can join
words: a suffix evidenced by a complete opposite-side token can establish a word boundary;
terminal `!`/`?` remain attached in this inline stream. This is word-level alignment, not a
promise of legacy token boundaries. Inline candidates must reconstruct both local trees or
fall back to structural alignment. Attribute changes and incompatible elements become
before/after replacements. Unknown elements,
preformatted/raw-text controls, selects, and SVG/MathML are atomic. Moves are delete/insert.
A successful coarse result preserves both sides and includes `coarse-replacement` diagnostics.

Changed comments use owned comment-containing wrappers where permitted. If a restricted
container (such as table/tr/ul) cannot contain those wrappers or changed inter-element text,
the replacement expands to that container. Templates are atomic: inspection, hashing, exact
equality and projection include their separate `content` trees, including nested templates.
Template and comment changes may be visually invisible; their operations/markers are present,
and the host owns hidden-content presentation. Preformatted/raw-text elements remain atomic.
Serialization compensates for the parser's initial-newline removal in HTML `pre`, `textarea`
and `listing`, including nested elements and public projected strings.

Namespace-changing parser repairs may still be declined by strict validation; specifically,
the malformed MathML `mtext/table/mglyph` and `malignmark` cases remain unsupported.
Malformed HTML is compared after parser repair. Arbitrary content-model repairs and browser
configuration differences are not promised; Chromium corpus tests are the browser check.
Head policy belongs to the host. `appearance-caveat` reminds it that hidden nodes, duplicate
IDs and CSS can alter merged appearance despite preserved body structure.

## Bounds

Defaults: 2,000,000 combined UTF-16 units; 200,000 nodes per side; depth 256; 50,000,000
abstract work units; 8,000,000 output units; cooperative deadline 15 seconds. The depth
ceiling of 256 cannot be raised in this spike, because parse5 serialization and matched
container descent use bounded recursion. Stage 3 retains these measured resource caps; they are not latency or memory guarantees.
All configured limits must be finite and nonnegative. Invalid values are unsupported.

Input size is checked before parsing. Node/depth inspection is iterative and occurs after
parsing. Global work covers inspection, equality, anchors, bounded candidate evidence,
local diff reservations, render-plan traversal and output validation size. Local text refinement
is capped at 512 combined tokens and 128 edits; inline streams additionally cap each side at
256 tokens before suffix refinement. Exhaustion falls back to bounded structural alignment or
coarse replacement, not an unbounded retry. Inline candidate assembly checks its output budget
before accumulating each fragment; rejected candidates do not leave journal entries behind.
Global exhaustion yields a limit outcome. Output length is reserved during render-plan construction, before retaining further chunks.
One current serialized fragment and operation payload can already occupy memory; final assembly
does not double-charge the reservation.

A synchronous parser or serializer cannot be preempted by this function. Always run in a
worker and terminate it for the host deadline or cancellation. The playground implements
that watchdog and never retries on the main thread. These bounds do not bound host layout.

`parseMs` includes parsing and node inspection/fingerprints;
`matchMs` includes alignment, operation payload serialization and render-plan construction;
`renderMs` covers bounded final assembly; `validateMs` covers both reparsed projections.
They exclude worker startup/transfer and host sanitization/layout. Stage 3 measures these
costs separately in `bench/STAGE3.md`. JavaScript heap/RSS cannot be hard-capped by this
synchronous API; a production host memory policy remains a release requirement.

## Stage 2 evidence (2026-09-05)

The unchanged upstream baseline is 87/87. Adapted acceptance is 317/317, with zero skips:
all original 197 checks plus 120 additional checks. Both projections use independent Chromium
DOM tuples (including template content); precision assertions remain separate and active.
All three 700-paragraph variants have 14 paragraph-local edits. See `COMPATIBILITY.md`,
`test/compatibility/results.json` and `test/compatibility/highlights.json`.
This completes the measured Stage 2 contract, not the Stage 3 performance or Stage 4 host gates.


## Stage 3 bounds decision

The existing numeric input/node/depth/work/output limits are retained, with boundary and
expansion evidence in [bench/STAGE3.md](bench/STAGE3.md). The envelope permits either a
validated success or an explicit bounded limit outcome; passing the input-size guard alone
does not imply every other budget fits. Depth includes text leaves: 255 nested divs plus a
text leaf fit 256; 256 divs plus a leaf do not. Node limits are per canonical parsed side.
The exact 2,000,000-unit input boundary is supported; one extra unit is rejected before parsing.

parse5 is pinned to 8.0.1. The engine subclasses its parser solely to bulk-adopt children in
linear time, preserving child order and parent links with the default adapter. This removes
quadratic front-array deletion during fragment finalization and adoption-agency moves.
Differential stock-parser and independent Chromium checks cover this dependency-sensitive
optimization. A parse5 upgrade requires rerunning these gates.

The host watchdog is essential even below the size guard: 80,000 nested divs per side fit
1,760,002 input units but do not reach post-parse inspection in 15 seconds on the measured
machine. A real parent termination and the playground's actual watchdog are tested; timer
scheduling adds milliseconds, so 15 seconds is a termination deadline, not an exact wall-clock
return guarantee. A frozen host event loop can delay its watchdog.

Stage 3's strict near-guard 2-second target fails for a synthetic 7.8 MB output expansion
(2.403 seconds p95). The user accepted this documented result for standalone 0.1.0; the strict
benchmark remains failing. Three fresh Chromium runs show summed browser RSS of 674–675 MiB
after comparison and 1,472–1,520 MiB after laying out that extreme result. Cleanup and forced
main-page GC reduce measured JS/DOM heaps; RSS retains allocator memory. These are snapshots,
not per-worker peaks or a memory ceiling. Hosts should limit active comparisons and release
workers/results/views when no longer needed. Host memory-pressure handling and packaged JCEF
validation belong to integration. See the source repository's `bench/release-memory-results.json`
and `release/README.md`; benchmark artifacts are not included in the npm tarball.
