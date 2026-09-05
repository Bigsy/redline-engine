import { rmSync } from "node:fs";
import { execFileSync } from "node:child_process";
// Remove obsolete declarations/maps so tarballs cannot contain stale build products.
rmSync(new URL("../dist/", import.meta.url), { recursive: true, force: true });
execFileSync(
  process.execPath,
  [
    new URL("../node_modules/typescript/bin/tsc", import.meta.url).pathname,
    "-p",
    "tsconfig.build.json",
  ],
  { stdio: "inherit", cwd: new URL("..", import.meta.url) },
);
