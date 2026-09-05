# Matching spike

`compare.ts` computes bottom-up fingerprints once, verifies equality, and finds an LIS of
unique sibling anchors. It descends into compatible containers so outer wrappers do not
prevent alignment. Non-unique gaps use stable order with a four-position lookahead and
at most 32 immediate-child fingerprint hints per candidate (`evidence.ts`). Hints never
establish equality. Attribute or incompatible-tag changes produce coarse replacements.

Small text-node pairs use jsdiff `diffArrays` over exact Unicode word, whitespace and
punctuation tokens: 512 combined tokens, 128 maximum edits, and a conservative Cartesian
work reservation charged to the shared budget. Token collection stops as soon as the combined cap is exceeded; giant text is never fully
expanded into token arrays. Larger local changes use marked replacement.
`inline.ts` maps bounded token streams across formatting ancestry and atomic leaves. Side-specific
formatting shells retain shared words and valid projected nesting; candidates must pass local
projection validation before being accepted. No general character refinement, move detection
or histogram anchor implementation is claimed. Restricted content models expand replacement
boundaries when local wrappers would be repaired by the parser.
