import { test, expect } from "@playwright/test";
import { compareBodies } from "../../src/index.ts";
import { cases } from "../fixtures/cases.ts";
import { readFileSync } from "node:fs";
import { parse, serialize } from "parse5";
function body(s: string) {
  const doc = parse(s);
  const stack = [...doc.childNodes];
  while (stack.length) {
    const n = stack.pop()!;
    if ("tagName" in n && n.tagName === "body") return serialize(n);
    if ("childNodes" in n) stack.push(...n.childNodes);
  }
  throw Error("body absent");
}
const corpus = ["collection-guide", "transaction-guide", "welcome-pack"].map(
  (name) => ({
    name,
    before: body(
      readFileSync(
        new URL(`../fixtures/legacy/mock/before/${name}.html`, import.meta.url),
        "utf8",
      ),
    ),
    after: body(
      readFileSync(
        new URL(`../fixtures/legacy/mock/after/${name}.html`, import.meta.url),
        "utf8",
      ),
    ),
  }),
);
for (const fixture of [...cases, ...corpus])
  test(`Chromium preserves ${fixture.name}`, async ({ page }) => {
    const result = compareBodies({
      beforeHtml: fixture.before,
      afterHtml: fixture.after,
    });
    expect(result.outcome, JSON.stringify(result)).toBe("success");
    if (result.outcome !== "success") return;
    const projected = await page.evaluate(
      ({ merged, before, after }) => {
        const parseBody = (s: string) => {
          const body = document.createElement("body");
          body.innerHTML = s;
          return body;
        };
        const shape = (node: Node): unknown => {
          if (!(node instanceof Element))
            return [node.nodeType, node.nodeValue];
          return [
            node.nodeType,
            node.namespaceURI,
            node.localName,
            [...node.attributes]
              .map((a) =>
                JSON.stringify([
                  a.namespaceURI ?? "",
                  a.prefix ?? "",
                  a.localName,
                  a.value,
                ]),
              )
              .sort(),
            [
              ...(node instanceof HTMLTemplateElement
                ? node.content.childNodes
                : node.childNodes),
            ].map(shape),
          ];
        };
        const canonical = (s: string) => shape(parseBody(s));
        function project(side: "before" | "after") {
          const body = parseBody(merged);
          for (const element of [
            ...body.querySelectorAll("[data-diff-node],[data-diff-unwrap]"),
          ]) {
            if (
              element.getAttribute("data-diff-node") ===
              (side === "before" ? "insert" : "delete")
            )
              element.remove();
            else if (
              element.hasAttribute("data-diff-wrapper") ||
              element.getAttribute("data-diff-unwrap") === side
            )
              element.replaceWith(...element.childNodes);
            else
              for (const attr of [...element.attributes])
                if (attr.name.startsWith("data-diff-"))
                  element.removeAttribute(attr.name);
          }
          body.normalize();
          return shape(body);
        }
        return {
          before: project("before"),
          after: project("after"),
          expectedBefore: canonical(before),
          expectedAfter: canonical(after),
        };
      },
      { merged: result.comparison.mergedHtml, ...fixture },
    );
    expect(projected.before).toEqual(projected.expectedBefore);
    expect(projected.after).toEqual(projected.expectedAfter);
  });
test("playground worker, coarse replacement, limit and isolated previews", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:5173");
  await expect(page.locator("#status")).toHaveText("success");
  await expect(page.frameLocator("#merged-view").locator("ins")).toContainText([
    "new",
    "!",
  ]);
  await page.selectOption("#fixture", { label: "coarse local replacement" });
  await expect(page.locator("#diagnostics")).toContainText(
    "coarse-replacement",
  );
  await page.check("#limit");
  await page.click("#compare");
  await expect(page.locator("#status")).toHaveText("limit");
  await page.uncheck("#limit");
  await page
    .locator("#after")
    .fill(
      '<p onclick="alert(1)">Safe<script>alert(1)</script><img src="https://example.invalid/x"></p>',
    );
  await page.click("#compare");
  await expect(page.locator("#status")).toHaveText("success");
  const source = await page.locator("#after-view").getAttribute("srcdoc");
  expect(source).not.toContain("onclick");
  expect(source).not.toContain("<script");
  expect(source).not.toContain("https://example.invalid");
  expect(await page.locator("#after-view").getAttribute("sandbox")).toBe("");
  await page.selectOption("#fixture", { label: "table" });
  await expect(page.locator("#status")).toHaveText("success");
  await page.screenshot({
    path: "test-results/playground-table.png",
    fullPage: true,
  });
});

test("representative visual examples", async ({ page }) => {
  await page.goto("http://127.0.0.1:5173");
  for (const label of ["words", "list", "attributes", "table"]) {
    await page.selectOption("#fixture", { label });
    await expect(page.locator("#status")).toHaveText("success");
    await page.screenshot({
      path: `test-results/example-${label}.png`,
      fullPage: true,
    });
  }
});

test("body context discards stray table tags before comparison", async ({
  page,
}) => {
  const before = '<tr><td class="a">A</td></tr>',
    after = '<tr><td class="b">A</td></tr>';
  const result = compareBodies({ beforeHtml: before, afterHtml: after });
  expect(result.outcome).toBe("success");
  if (result.outcome !== "success") return;
  const canonical = await page.evaluate((source) => {
    const body = document.createElement("body");
    body.innerHTML = source;
    return body.innerHTML;
  }, before);
  expect(canonical).toBe("A");
  expect(result.comparison.mergedHtml).toBe(canonical);
});
for (const tag of ["mglyph", "malignmark"])
  test(`declines serialization-hidden ${tag} namespace repair`, async ({
    page,
  }) => {
    const source = `<math><mtext><table><${tag}>`;
    const namespaces = await page.evaluate(
      ({ source, tag }) => {
        const original = document.createElement("body"),
          reparsed = document.createElement("body");
        original.innerHTML = source;
        reparsed.innerHTML = original.innerHTML;
        return [
          original.querySelector(tag)!.namespaceURI,
          reparsed.querySelector(tag)!.namespaceURI,
        ];
      },
      { source, tag },
    );
    expect(namespaces).toEqual([
      "http://www.w3.org/1999/xhtml",
      "http://www.w3.org/1998/Math/MathML",
    ]);
    expect(
      compareBodies({ beforeHtml: source, afterHtml: source }).outcome,
    ).toBe("unsupported");
  });

test("Stage 2 representative actual highlights", async ({ page }) => {
  const examples = [
    { name: "Plain text", before: "working on it", after: "working in it" },
    {
      name: "Across inline formatting",
      before: "<p>the <b>quick</b> fox</p>",
      after: "<p>the quick <b>brown</b> fox</p>",
    },
    {
      name: "Atomic insertion amid words",
      before: "old text",
      after: "new<br> text",
    },
    {
      name: "Comment deletion",
      before: "<!-- reviewer note --><p>same</p>",
      after: "<p>same</p>",
    },
    {
      name: "Leading newline",
      before: "<pre>\n\na</pre>",
      after: "<pre>\n\nb</pre>",
    },
  ];
  const escape = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;");
  const panels = examples.map((f) => {
    const r = compareBodies({ beforeHtml: f.before, afterHtml: f.after });
    expect(r.outcome).toBe("success");
    if (r.outcome !== "success") throw Error(r.outcome);
    return `<section><h2>${f.name}</h2><div class="rendered">${r.comparison.mergedHtml}</div><pre class="source">${escape(r.comparison.mergedHtml)}</pre></section>`;
  });
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.setContent(
    `<style>body{font:17px system-ui;margin:24px;color:#202020}h2{font-size:19px}section{margin:18px 0;padding:14px;border:1px solid #aaa}.rendered{padding:10px}ins,[data-diff-node=insert]{background:#d3f3da}del,[data-diff-node=delete]{background:#f8d5d5}[data-diff-unwrap]{outline:1px dashed #956600}.source{white-space:pre-wrap;overflow-wrap:anywhere;font:12px monospace;color:#555}</style><h1>Stage 2 actual merged highlights</h1>${panels.join("")}`,
  );
  await page.screenshot({
    path: "test-results/stage2-highlights.png",
    fullPage: true,
  });
});
