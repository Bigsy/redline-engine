# Pinned upstream evidence

`node-htmldiff-0.9.4/` is the complete, unchanged published package, including all
87 test declarations, sample HTML/images, engine, README and MIT license.

- Package: `node-htmldiff@0.9.4`.
- Source: <https://github.com/idesis-gmbh/htmldiff.js>.
- Metadata: <https://registry.npmjs.org/node-htmldiff/0.9.4>.
- Tarball: <https://registry.npmjs.org/node-htmldiff/-/node-htmldiff-0.9.4.tgz>.
- Verified 2026-09-05 before extraction, SHA-512 SRI:
  `sha512-Nvnv0bcehOFsH/TD+bi4ls3iWTRQiytqII5+I1iBUypO+GFMYLcyBJfS2U3DMRSIYzfZHysaYLYoCXx6Q148Hg==`.
- MIT notices: 2012 The Network Inc. and contributors; 2022 idesis GmbH.
  See the original `LICENSE` and `package.json`; adapted examples retain these notices by reference.

`SHA256SUMS.json` records every extracted file. The baseline verifies these hashes
before executing unchanged specs. Normal test discovery uses explicit `.test.ts`
patterns, while originals use `.spec.js`; `.prettierignore` excludes this directory.
The package's published `files: ["dist"]` prevents shipping this test engine.
No upstream lifecycle scripts or historical build dependencies were installed.

Reimport only from the pinned tarball after verifying the SRI, then extract with
`tar -xzf package.tgz --strip-components=1 -C test/fixtures/upstream/node-htmldiff-0.9.4`.
Do not regenerate hashes to excuse edited originals.

Run `pnpm run test:upstream` for the isolated original baseline and
`pnpm run test:compatibility` for the separate, deliberately failing Stage 2
acceptance gate. See `COMPATIBILITY.md` for results and assertion corrections.
