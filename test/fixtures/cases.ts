/** Original synthetic fixtures, MIT; no customer documents. */
export const cases = [
  {
    name: "words",
    before: "<p>Hello old world.</p>",
    after: "<p>Hello new world!</p>",
  },
  {
    name: "nested insertion",
    before: "<section><div><p>A</p><p>B</p></div></section>",
    after: "<section><div><p>Start</p><p>A</p><p>B</p></div></section>",
  },
  {
    name: "repetition",
    before: "<div><p>x</p><p>x</p></div>",
    after: "<div><p>x</p><p>x</p><p>x</p></div>",
  },
  {
    name: "list",
    before: "<ul><li>A</li><li>B</li></ul>",
    after: "<ol><li>B</li><li>C</li></ol>",
  },
  {
    name: "table",
    before: "<table><tr><td>A</td><td>B</td></tr></table>",
    after:
      "<table><tr><td>New</td></tr><tr><td>A</td><td>Changed</td></tr></table>",
  },
  {
    name: "attributes",
    before: '<p id="x" title="a > b">A</p>',
    after: '<p id="x" title="c > b">A</p>',
  },
  {
    name: "attribute text shell",
    before: '<p title="a > b">A</p>',
    after: '<p title="a > b">B</p>',
  },
  {
    name: "void and empty",
    before: '<div><p></p><img src="a"><br><hr></div>',
    after: '<div><p></p><img src="b"><br><hr><span></span></div>',
  },
  {
    name: "formatting",
    before: "<p>A <strong>bold word</strong> end</p>",
    after: "<p>A <em>italic word</em> end</p>",
  },
  {
    name: "unicode entities",
    before: "<p>👩🏽‍💻 café &amp; 中文 é</p>",
    after: "<p>👩🏽‍🔬 cafés &#38; 中文 é!</p>",
  },
  {
    name: "whitespace",
    before: "<div> a\n <pre>one\t two\n</pre> </div>",
    after: "<div> a  <pre>one  two\n</pre> </div>",
  },
  { name: "malformed", before: "<p>a<p>b", after: "<p>a<p>c" },
  {
    name: "select",
    before: "<select><option>A</option></select>",
    after: "<select><option selected>B</option></select>",
  },
  {
    name: "foreign",
    before: '<svg viewBox="0 0 10 10"><circle r="1"/></svg>',
    after: '<svg viewBox="0 0 10 10"><circle r="2"/></svg>',
  },
  {
    name: "unrelated",
    before: "<article><h1>A</h1><p>B</p></article>",
    after: "<table><tr><td>C</td></tr></table>",
  },
];
export function structural(count: number, nested = true) {
  const paragraphs = Array.from(
    { length: count },
    (_, i) =>
      `<p>Paragraph ${i}: the quick brown fox jumps over a lazy dog.</p>`,
  ).join("");
  const wrap = (s: string) =>
    nested ? `<section><div>${s}</div></section>` : s;
  return {
    before: wrap(paragraphs),
    after: wrap("<p>Inserted at the start.</p>" + paragraphs),
  };
}

/** Adapted from the licensed legacy generator: sparse edits defeat whole-body matching. */
export function sparse(count: number, inserted = false) {
  const build = (edited: boolean) =>
    "<section>" +
    (edited && inserted ? "<p>Inserted start.</p>" : "") +
    Array.from({ length: count }, (_, i) => {
      const text =
        edited && i % 50 === 0
          ? `This paragraph number ${i} has been edited to exercise the size guard.`
          : `This is paragraph number ${i} of a large synthetic document used for manual testing.`;
      return `<p>${text} <b>Bold segment ${i}</b> and <a href="#s${i}">a link to section ${i}</a>.</p>\n`;
    }).join("") +
    "</section>";
  return { before: build(false), after: build(true) };
}
