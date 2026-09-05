import { cases } from "../test/fixtures/cases.ts";
import { readFileSync } from "node:fs";
import { parse, serialize } from "parse5";
export function body(source) {
  const stack = [parse(source)];
  while (stack.length) {
    const n = stack.pop();
    if (n.tagName === "body") return serialize(n);
    stack.push(...(n.childNodes ?? []));
  }
  throw Error("Missing body");
}
export function fixtures(extra = Boolean(process.env.STAGE3_EXTRA)) {
  if (extra)
    return [
      ...cases.map((f) => ({
        name: `fixture-${f.name}`,
        beforeHtml: f.before,
        afterHtml: f.after,
      })),
      {
        name: "nodes-exact-identity",
        beforeHtml: "<br>".repeat(200000),
        afterHtml: "<br>".repeat(200000),
      },
      {
        name: "expansion-over",
        beforeHtml: "<i>a</i>".repeat(80000),
        afterHtml: "<b>b</b>".repeat(80000),
      },
      {
        name: "work-bounded-dense",
        beforeHtml: "<p>Original shared words with context.</p>".repeat(15000),
        afterHtml: "<p>Changed shared words with context.</p>".repeat(15000),
        limits: { maxWork: 1000000 },
      },
      {
        name: "input-exact-identity",
        beforeHtml: "x".repeat(1000000),
        afterHtml: "x".repeat(1000000),
      },
    ];
  const rows = [];
  const add = (name, before, after, limits) =>
    rows.push({
      name,
      beforeHtml: before,
      afterHtml: after,
      ...(limits ? { limits } : {}),
    });
  for (const size of [20, 700, 5800]) {
    for (const density of [0.02, 0.5, 1]) {
      const build = (edited) =>
        Array.from(
          { length: size },
          (_, i) =>
            `<p>Paragraph ${i}: ${edited && i % Math.round(1 / density) === 0 ? "Changed" : "Original"} words with <b>bold segment</b> and a shared ending for comparison.</p>`,
        ).join("");
      const a = build(false),
        b = build(true);
      add(`edits-${size}-${density}`, a, b);
      if (density === 0.02) {
        add(`start-${size}`, a, "<p>Inserted start.</p>" + b);
        add(
          `wrapper-${size}`,
          "<section>" + a + "</section>",
          "<section>" + b + "</section>",
        );
      }
    }
    add(
      `repeated-${size}`,
      "<p>same paragraph</p>".repeat(size),
      "<p>inserted</p>" + "<p>same paragraph</p>".repeat(size),
    );
  }
  for (const size of [1000, 100000, 950000])
    add(
      `giant-${size}`,
      "<p>" + ".".repeat(size) + "</p>",
      "<p>" + ",".repeat(size) + "</p>",
    );
  for (const depth of [64, 255, 256, 300, 10000])
    add(
      `depth-${depth}`,
      "<div>".repeat(depth) + "a" + "</div>".repeat(depth),
      "<div>".repeat(depth) + "b" + "</div>".repeat(depth),
    );
  for (const size of [1000, 20000, 70000])
    add(`expansion-${size}`, "<i>a</i>".repeat(size), "<b>b</b>".repeat(size));
  add("nodes-near", "<br>".repeat(199999), "");
  add("nodes-over", "<br>".repeat(200001), "");
  add("input-over", "a".repeat(1000001), "b".repeat(1000000));
  add("work-low", "<p>old</p>", "<p>new</p>", { maxWork: 1 });
  add("output-low", "<p>old</p>", "<p>new</p>", { maxOutputUnits: 10 });
  add("deadline-zero", "<p>old</p>", "<p>new</p>", { timeoutMs: 0 });
  for (const name of ["collection-guide", "transaction-guide", "welcome-pack"])
    add(
      `corpus-${name}`,
      ...["before", "after"].map((side) =>
        body(
          readFileSync(
            new URL(
              `../test/fixtures/legacy/mock/${side}/${name}.html`,
              import.meta.url,
            ),
            "utf8",
          ),
        ),
      ),
    );
  const sibling = ["before", "after"].map((side) =>
    body(
      readFileSync(
        new URL(
          `../../redline/testdata/large/generated/${side}.html`,
          import.meta.url,
        ),
        "utf8",
      ),
    ),
  );
  add("sibling-original", ...sibling);
  add("sibling-wrapper", ...sibling.map((s) => "<section>" + s + "</section>"));
  add("sibling-start", sibling[0], "<p>Inserted start.</p>" + sibling[1]);
  return rows;
}
