import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
import { createHash } from "node:crypto";
import { chai, expect, it, afterAll } from "vitest";

// Execute unchanged sloppy-mode CommonJS specs with their original Chai assertions.
// Only the synchronous describe/beforeEach/it subset used by this pinned suite is needed.
const root = new URL(
  "../fixtures/upstream/node-htmldiff-0.9.4/",
  import.meta.url,
);
const hashes = JSON.parse(
  readFileSync(new URL("../SHA256SUMS.json", root), "utf8"),
) as Record<string, string>;
for (const [name, hash] of Object.entries(hashes))
  if (
    createHash("sha256")
      .update(readFileSync(new URL(name, root)))
      .digest("hex") !== hash
  )
    throw Error(`Upstream original changed: ${name}`);
const require = createRequire(new URL("package.json", root));
const original = require("./js/htmldiff.js");
const records: Record<string, unknown>[] = [];
for (const file of readdirSync(new URL("test/", root))
  .filter((f) => f.endsWith(".spec.js"))
  .sort()) {
  const source = readFileSync(new URL(`test/${file}`, root), "utf8");
  const frames: { title: string; hooks: (() => void)[] }[] = [];
  let ordinal = 0;
  let calls: { kind: string; args: unknown[] }[] = [];
  let assertions = 0;
  const wrap = (fn: Function, kind: string): any =>
    new Proxy(fn, {
      apply(target, receiver, args) {
        calls.push({ kind, args });
        return Reflect.apply(target, receiver, args);
      },
      get(target, key) {
        const value = Reflect.get(target, key);
        return typeof value === "function" ? wrap(value, String(key)) : value;
      },
    });
  const engine = wrap(original, "diff");
  const context = vm.createContext({
    require: (name: string) => (name === "chai" ? chai : engine),
    expect: (...args: Parameters<typeof chai.expect>) => {
      assertions++;
      return chai.expect(...args);
    },
    describe(title: string, fn: () => void) {
      frames.push({ title, hooks: [] });
      fn();
      frames.pop();
    },
    beforeEach(fn: () => void) {
      frames.at(-1)!.hooks.push(fn);
    },
    it(title: string, fn: () => void) {
      const index = ++ordinal;
      const hooks = frames.flatMap((f) => f.hooks);
      const fullTitle = [...frames.map((f) => f.title), title].join(" > ");
      it(`${file}#${index}: ${fullTitle}`, () => {
        calls = [];
        assertions = 0;
        let error: unknown;
        try {
          for (const hook of hooks) hook();
          fn();
        } catch (e) {
          error = e;
        }
        const pair = [...calls]
          .reverse()
          .find(
            (c) =>
              c.kind === "diff" ||
              c.kind === "calculateOperations" ||
              c.kind === "createSegment",
          );
        const stringify = (value: any) =>
          typeof value === "string"
            ? value
            : value.map((t: { string: string }) => t.string).join("");
        const inputs = pair
          ? { before: stringify(pair.args[0]), after: stringify(pair.args[1]) }
          : undefined;
        const single = calls
          .filter((c) => c.kind === "htmlToTokens")
          .map((c) => c.args[0]);
        records.push({
          id: `${file.replace(".spec.js", "")}#${String(index).padStart(2, "0")}`,
          file,
          title: fullTitle,
          assertions,
          passed: !error,
          ...(error ? { error: String(error) } : {}),
          ...(inputs
            ? { inputs, legacyHtml: original(inputs.before, inputs.after) }
            : {}),
          ...(single.length ? { single } : {}),
        });

        expect(error).toBeUndefined();
      });
    },
  });
  vm.runInContext(source, context, { filename: file });
}

afterAll(() => {
  expect(records).toHaveLength(87);
  if (process.env.UPDATE_UPSTREAM_BASELINE === "1")
    writeFileSync(
      new URL("baseline.json", import.meta.url),
      JSON.stringify(records, null, 2) + "\n",
    );
  else
    expect(records).toEqual(
      JSON.parse(
        readFileSync(new URL("baseline.json", import.meta.url), "utf8"),
      ),
    );
});
