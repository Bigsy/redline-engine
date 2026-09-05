import {
  parse,
  element,
  children,
  serializeNodes,
  type Node,
} from "../parse/tree.ts";
import type { Comparison, Side } from "../model/types.ts";

/** Reparse actual rendered HTML, remove the opposite side, unwrap owned inline markers. */
export function projectTree(
  mergedHtml: string,
  side: Side,
  dataPrefix = "diff",
): ReturnType<typeof parse> {
  const root = parse(mergedHtml);
  const prefix = `data-${dataPrefix}-`;
  const stack: { parent: { childNodes: Node[] }; visited: boolean }[] = [
    { parent: root, visited: false },
  ];
  while (stack.length) {
    const { parent, visited } = stack.pop()!;
    if (!visited) {
      stack.push({ parent, visited: true });
      for (const node of parent.childNodes) {
        if (element(node))
          stack.push({
            parent: "content" in node ? node.content : node,
            visited: false,
          });
      }
      continue;
    }
    const next: Node[] = [];
    const append = (node: Node) => {
      const last = next.at(-1);
      if (last && "value" in last && "value" in node) last.value += node.value;
      else {
        node.parentNode = parent as typeof node.parentNode;
        next.push(node);
      }
    };
    for (const node of parent.childNodes) {
      if (element(node)) {
        const marker = node.attrs.find(
          (a) => a.name === `${prefix}node`,
        )?.value;
        if (marker === (side === "before" ? "insert" : "delete")) continue;
        const wrapper = node.attrs.some(
          (a) =>
            a.name === `${prefix}wrapper` ||
            (a.name === `${prefix}unwrap` && a.value === side),
        );
        node.attrs = node.attrs.filter((a) => !a.name.startsWith(prefix));
        if (wrapper) {
          for (const child of children(node)) append(child);
          continue;
        }
      }
      append(node);
    }
    parent.childNodes = next;
  }
  return root;
}
export function projectHtml(
  mergedHtml: string,
  side: Side,
  dataPrefix = "diff",
): string {
  return serializeNodes(projectTree(mergedHtml, side, dataPrefix).childNodes);
}
export function project(comparison: Comparison, side: Side): string {
  return projectHtml(comparison.mergedHtml, side, comparison.dataPrefix);
}
