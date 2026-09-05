import {
  Parser,
  serialize,
  serializeOuter,
  defaultTreeAdapter,
  html as parse5Html,
  type DefaultTreeAdapterMap,
} from "parse5";
export type Node = DefaultTreeAdapterMap["childNode"];
export type Element = DefaultTreeAdapterMap["element"];
export const element = (n: Node): n is Element => "tagName" in n;
export const children = (n: Node): Node[] =>
  "content" in n ? n.content.childNodes : "childNodes" in n ? n.childNodes : [];
function serializationNode(n: Node): Node {
  if (!element(n)) return { ...n };
  const copy = { ...n, childNodes: children(n).map(serializationNode) };
  if (
    n.namespaceURI === "http://www.w3.org/1999/xhtml" &&
    ["pre", "textarea", "listing"].includes(n.tagName)
  ) {
    const first = copy.childNodes[0];
    if (first && "value" in first && first.value.startsWith("\n"))
      first.value = "\n" + first.value;
  }
  if ("content" in n)
    return {
      ...copy,
      childNodes: [],
      content: { ...n.content, childNodes: copy.childNodes },
    } as Node;
  return copy;
}
export const html = (n: Node): string => serializeOuter(serializationNode(n));
export const serializeNodes = (nodes: Node[]): string =>
  nodes.map(html).join("");
/** parse5 8.0.1 shifts the donor array once per adopted child, quadratic for
 * wide body fragments. With its default adapter the exact equivalent is a bulk
 * move plus parent-link updates. Keep the pinned parser and differential tests. */
class BodyParser extends Parser<DefaultTreeAdapterMap> {
  override _adoptNodes(
    donor: DefaultTreeAdapterMap["parentNode"],
    recipient: DefaultTreeAdapterMap["parentNode"],
  ): void {
    const nodes = donor.childNodes;
    donor.childNodes = [];
    for (const node of nodes) {
      recipient.childNodes.push(node);
      node.parentNode = recipient;
    }
  }
}
/** parse5's omitted fragment context is a template, so supply body explicitly. */
export const parse = (s: string): DefaultTreeAdapterMap["documentFragment"] => {
  const parser = BodyParser.getFragmentParser<DefaultTreeAdapterMap>(
    defaultTreeAdapter.createElement("body", parse5Html.NS.HTML, []),
    {},
  );
  parser.tokenizer.write(s, true);
  return parser.getFragment();
};
export const canonical = (s: string): string =>
  serializeNodes(parse(s).childNodes);
export const signature = (n: Node): string =>
  element(n)
    ? JSON.stringify([
        n.tagName,
        n.namespaceURI,
        n.attrs
          .map((a) =>
            JSON.stringify([
              a.namespace ?? "",
              a.prefix ?? "",
              a.name,
              a.value,
            ]),
          )
          .sort(),
      ])
    : n.nodeName;

/** Serialized HTML can hide namespace changes after parser repair. Compare raw DOM tuples. */
export function sameTree(
  a: readonly Node[],
  b: readonly Node[],
  charge: (units?: number) => void,
): boolean {
  if (a.length !== b.length) return false;
  const stack: [Node, Node][] = a.map((node, i) => [node, b[i]!]);
  while (stack.length) {
    charge();
    const [x, y] = stack.pop()!;
    const xs = signature(x),
      ys = signature(y);
    charge(xs.length + ys.length);
    if (xs !== ys) return false;
    if ("value" in x && (!("value" in y) || x.value !== y.value)) return false;
    if ("data" in x && (!("data" in y) || x.data !== y.data)) return false;
    const xc = children(x),
      yc = children(y);
    if (xc.length !== yc.length) return false;
    for (let i = 0; i < xc.length; i++) stack.push([xc[i]!, yc[i]!]);
  }
  return true;
}
