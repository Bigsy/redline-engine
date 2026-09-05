import { Window } from "happy-dom";
import { expect, beforeAll, afterAll } from "vitest";
import { chromium, type Browser, type Page } from "@playwright/test";
let browser: Browser;
let page: Page;
beforeAll(async () => {
  browser = await chromium.launch();
  page = await browser.newPage();
});
afterAll(async () => {
  await browser?.close();
});
import { compareBodies, renderMerged } from "../../src/index.ts";
export interface Fixture {
  id: string;
  sources: string[];
  before: string;
  after: string;
  context?: string;
  inserted?: string[];
  deleted?: string[];
  atomic?: string;
  marked?: string[];
}
export function parseBody(source: string) {
  const body = new Window({
    settings: {
      disableCSSFileLoading: true,
      disableJavaScriptFileLoading: true,
      disableJavaScriptEvaluation: true,
      disableIframePageLoading: true,
    },
  }).document.createElement("body");
  body.innerHTML = source;
  return body;
}
// Chromium parses the original inputs and merged output independently of parse5.
export async function canonical(
  source: string,
  side?: "before" | "after",
  prefix = "diff",
) {
  return page.evaluate(
    ({ source, side, prefix }) => {
      const body = document.createElement("body");
      body.innerHTML = source;
      if (side)
        for (const e of [
          ...body.querySelectorAll(
            `[data-${prefix}-node],[data-${prefix}-unwrap]`,
          ),
        ]) {
          if (
            e.getAttribute(`data-${prefix}-node`) ===
            (side === "before" ? "insert" : "delete")
          )
            e.remove();
          else if (
            e.hasAttribute(`data-${prefix}-wrapper`) ||
            e.getAttribute(`data-${prefix}-unwrap`) === side
          )
            e.replaceWith(...e.childNodes);
          else
            for (const a of [...e.attributes])
              if (a.name.startsWith(`data-${prefix}-`))
                e.removeAttribute(a.name);
        }
      body.normalize();
      const shape = (n: Node): unknown =>
        n instanceof Element
          ? [
              n.namespaceURI,
              n.localName,
              [...n.attributes]
                .map((a) =>
                  JSON.stringify([
                    a.namespaceURI,
                    a.prefix,
                    a.localName,
                    a.value,
                  ]),
                )
                .sort(),
              [
                ...(n instanceof HTMLTemplateElement
                  ? n.content.childNodes
                  : n.childNodes),
              ].map(shape),
            ]
          : [n.nodeType, n.nodeValue];
      return shape(body);
    },
    { source, side, prefix },
  );
}
export function compare(f: Fixture) {
  const r = compareBodies({ beforeHtml: f.before, afterHtml: f.after });
  expect(r.outcome, JSON.stringify(r)).toBe("success");
  if (r.outcome !== "success") throw Error(r.outcome);
  return renderMerged(r.comparison).html;
}
export async function preservation(f: Fixture) {
  const html = compare(f);
  for (const side of ["before", "after"] as const)
    expect(await canonical(html, side), side).toEqual(await canonical(f[side]));
}
export async function precision(f: Fixture) {
  const html = compare(f),
    body = parseBody(html);
  const markers = [...body.querySelectorAll("[data-diff-node]")];
  if (
    JSON.stringify(await canonical(f.before)) ===
    JSON.stringify(await canonical(f.after))
  )
    expect(markers).toHaveLength(0);
  else expect(markers.length).toBeGreaterThan(0);
  for (const [side, words] of [
    ["insert", f.inserted],
    ["delete", f.deleted],
  ] as const) {
    const text = markers
      .filter((e) => e.getAttribute("data-diff-node") === side)
      .map((e) => e.textContent)
      .join(" ");
    for (const word of words ?? []) expect(text).toContain(word);
  }
  for (const selector of f.marked ?? [])
    expect(body.querySelector(selector)).not.toBeNull();
  const atomic = f.atomic ?? "iframe,object,video,svg,math";
  for (const element of body.querySelectorAll(atomic))
    expect(element.querySelector("[data-diff-node]")).toBeNull();
  if (f.context !== undefined) {
    for (const marker of markers) marker.remove();
    expect(
      body.textContent.replace(/\s/g, ""),
      "unchanged readable context",
    ).toBe(f.context);
  }
}
