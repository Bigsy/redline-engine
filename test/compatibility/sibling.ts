import { readFileSync } from "node:fs";
import type { Fixture } from "./check.ts";
// Adapted from Redline 484e6aa; MIT notice: ../fixtures/legacy/LICENSE.
const f = (
  id: string,
  before: string,
  after: string,
  extra: Partial<Fixture> = {},
): Fixture => ({
  id: `PL-${id}`,
  sources: ["frontend/src/diff.test.ts"],
  before,
  after,
  ...extra,
});
export const sibling: Fixture[] = [
  ...[
    ["header", "<header><h1>Title</h1></header>"],
    ["video-js", "<video-js data-id='1'></video-js>"],
    ["style-guide", "<style-guide>tokens</style-guide>"],
  ].map(([id, prefix]) =>
    f(id!, prefix + "<p>old text</p>", prefix + "<p>new text</p>", {
      inserted: ["new"],
      deleted: ["old"],
    }),
  ),
  f(
    "default-atomic",
    "<header>same</header><p>old</p>",
    "<header>same</header><p>new</p>",
    { context: "same", inserted: ["new"], deleted: ["old"] },
  ),
  f(
    "video",
    "<video src='a.mp4'>fallback old</video>",
    "<video src='b.mp4'>fallback new</video>",
    {
      atomic: "video",
      marked: [
        'video[data-diff-node="insert"]',
        'video[data-diff-node="delete"]',
      ],
    },
  ),
  f("identity", "<p>unchanged</p>", "<p>unchanged</p>"),
  f(
    "attributes",
    '<p class="old">same text</p>',
    '<p class="new">same text</p>',
    {
      marked: [
        'p.old[data-diff-node="delete"]',
        'p.new[data-diff-node="insert"]',
      ],
    },
  ),
  f("mixed", '<p class="old">old text</p>', '<p class="new">new text</p>', {
    inserted: ["new text"],
    deleted: ["old text"],
  }),
  f("text", "<p>old text stays</p>", "<p>new text stays</p>", {
    context: "textstays",
    inserted: ["new"],
    deleted: ["old"],
  }),
  f(
    "blocks-added",
    "<ol><li>a</li></ol><table><tbody><tr><td>1</td></tr></tbody></table>",
    "<ol><li>a</li><li>b</li></ol><table><tbody><tr><td>1</td></tr><tr><td>2</td></tr></tbody></table>",
    {
      context: "a1",
      marked: ['li[data-diff-node="insert"]', 'tr[data-diff-node="insert"]'],
    },
  ),
  f(
    "blocks-removed",
    "<ul><li>keep</li><li>drop me</li></ul>",
    "<ul><li>keep</li></ul>",
    { context: "keep", deleted: ["drop me"] },
  ),
  f("void-added", "<p>x</p>", "<p>x</p><hr>", {
    context: "x",
    marked: ['hr[data-diff-node="insert"]'],
  }),
  f(
    "reindent",
    "\n  <p>same text</p>\n  <p>more</p>\n",
    "\n\t\t\t<p>same text</p>\n\n\t\t\t<p>more</p>\n\n",
    { context: "sametextmore" },
  ),
  f("space-added", "<p><b>a</b><i>b</i></p>", "<p><b>a</b> <i>b</i></p>", {
    context: "ab",
    inserted: [" "],
  }),
  f(
    "crlf",
    "<p>line one</p>\n<p>line two</p>",
    "<p>line one</p>\r\n<p>line two</p>",
  ),
  f("pre", "<pre>a\n  b</pre>", "<pre>a\nb</pre>", { atomic: "pre" }),
  f(
    "inline-pre",
    '<p style="white-space: pre">a  b</p>',
    '<p style="white-space: pre">a b</p>',
    { context: "ab" },
  ),
  f(
    "around-pre",
    "<pre>a\n  b</pre>\n<p>t</p>",
    "<pre>a\n  b</pre>\n\n\t<p>t</p>",
    { context: "abt" },
  ),
];
// Reverse additions too: empty elements must not survive as phantom nodes.
for (const id of ["blocks-added", "void-added"]) {
  const source = sibling.find((f) => f.id === `PL-${id}`)!;
  sibling.push(
    f(`${id}-reverse`, source.after, source.before, {
      context: source.context!,
    }),
  );
}
for (const variant of ["aligned", "wrapped", "start-insert"]) {
  const body = (edited: boolean) =>
    Array.from({ length: 700 }, (_, i) => {
      const text =
        edited && i % 50 === 0
          ? `Paragraph ${i} was edited to exercise the large document fast path.`
          : `Paragraph ${i} is unchanged synthetic prose with enough content to make the whole document large.`;
      return `<p>${text} <b>Bold segment ${i}</b> and <a href="#s${i}">link ${i}</a>.</p>\n`;
    }).join("");
  const wrap = (s: string) =>
    variant === "aligned" ? s : `<section><div>${s}</div></section>`;
  sibling.push(
    f(
      `sparse-${variant}`,
      wrap(body(false)),
      wrap(
        (variant === "start-insert" ? "<p>Inserted start.</p>" : "") +
          body(true),
      ),
      { inserted: ["was edited"] },
    ),
  );
}
for (const name of ["transaction-guide", "collection-guide", "welcome-pack"]) {
  const body = (side: string) => {
    const source = readFileSync(
      `test/fixtures/legacy/mock/${side}/${name}.html`,
      "utf8",
    );
    return source.match(/<body[^>]*>([\s\S]*)<\/body>/i)![1]!;
  };
  sibling.push({
    ...f(
      `corpus-${name}`,
      body("before"),
      body("after"),
      name === "transaction-guide"
        ? {
            inserted: ["Rate limits", "250"],
            marked: ["nav.toc [data-diff-node]"],
          }
        : name === "collection-guide"
          ? {
              marked: [
                '.callout:not(.warning)[data-diff-node="delete"]',
                '.callout.warning[data-diff-node="insert"]',
              ],
            }
          : {},
    ),
    sources: ["frontend/src/corpus.test.ts", "test/fixtures/legacy/mock/"],
  });
}
