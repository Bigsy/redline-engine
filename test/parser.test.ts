import { expect, it } from "vitest";
import { parseFragment, defaultTreeAdapter, html as parse5Html } from "parse5";
import { parse, sameTree, children } from "../src/parse/tree.ts";
import { cases } from "./fixtures/cases.ts";

it("bulk adoption matches the pinned stock parser, including adoption-agency repairs", () => {
  const sources = [
    ...cases.flatMap((f) => [f.before, f.after]),
    "<b>one<p>two</b>three</p>",
    "<b><i>one</b>two</i>three",
    "<table>foster<b>text<tr><td>x</table>end",
    "<template><b>one<p>two</b></template>",
    "<br>".repeat(20000),
    ...Array.from(
      { length: 100 },
      (_, i) => "<b><i><p>".repeat(i % 9) + "x</b>y</i></p>".repeat(i % 7),
    ),
  ];
  for (const source of sources) {
    const expected = parseFragment(
      defaultTreeAdapter.createElement("body", parse5Html.NS.HTML, []),
      source,
      {},
    );
    const actual = parse(source);
    expect(
      sameTree(actual.childNodes, expected.childNodes, () => {}),
      source.slice(0, 100),
    ).toBe(true);
    const stack = [...actual.childNodes];
    for (const node of stack) expect(node.parentNode).toBe(actual);
    while (stack.length) {
      const n = stack.pop()!;
      for (const child of children(n)) {
        expect(child.parentNode).toBe("content" in n ? n.content : n);
        stack.push(child);
      }
    }
  }
});
