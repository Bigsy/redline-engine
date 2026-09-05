import { diffArrays } from "diff";
import {
  children,
  element,
  html,
  signature,
  type Node,
  type Element,
} from "../parse/tree.ts";

const formatting = new Set(
  "span strong em b i u s a small sub sup ins del".split(" "),
);
const atomics = new Set(
  "br wbr img input iframe object video audio svg math".split(" "),
);
interface Token {
  value: string;
  path: Element[];
  node?: Node;
}
export interface InlinePiece {
  before?: Token;
  after?: Token;
}
/** Bounded word stream retaining the original formatting ancestry and atomic leaves. */
export function inlinePieces(
  a: Node[],
  b: Node[],
  atomic: Set<string>,
  charge: (n?: number) => void,
): InlinePiece[] | undefined {
  const flatten = (nodes: Node[]): Token[] | undefined => {
    const tokens: Token[] = [];
    const walk = (nodes: Node[], path: Element[]): boolean => {
      for (const node of nodes) {
        charge();
        if (node.nodeName === "#text" && "value" in node) {
          charge(node.value.length);
          for (const m of node.value.matchAll(
            /[\p{L}\p{N}\p{M}]+[!?]*|\s+|[^\p{L}\p{N}\p{M}\s]/gu,
          )) {
            if (tokens.length >= 256) return false;
            tokens.push({ value: m[0], path });
          }
        } else if (
          element(node) &&
          node.namespaceURI === "http://www.w3.org/1999/xhtml" &&
          formatting.has(node.tagName) &&
          !atomic.has(node.tagName) &&
          children(node).length
        ) {
          if (!walk(children(node), [...path, node])) return false;
        } else if (
          element(node) &&
          (atomics.has(node.tagName) ||
            atomic.has(node.tagName) ||
            formatting.has(node.tagName))
        ) {
          if (tokens.length >= 256) return false;
          tokens.push({ value: `\0${html(node)}`, path, node });
        } else return false;
      }
      return true;
    };
    return walk(nodes, []) ? tokens : undefined;
  };
  let at = flatten(a),
    bt = flatten(b);
  if (!at || !bt) return undefined;
  // Parser-discarded markup can join two words. Recover a suffix boundary evidenced
  // by an entire token on the other side, without character-level word highlighting.
  const splitSuffix = (tokens: Token[], other: Token[]) =>
    tokens.flatMap((t) => {
      if (t.node || !/^[\p{L}\p{N}\p{M}]+$/u.test(t.value)) return [t];
      const suffix = other.find((o) => {
        if (o.node || o.value.length >= t.value.length || o.value.length <= 1)
          return false;
        charge(o.value.length);
        return t.value.endsWith(o.value);
      });
      return suffix
        ? [
            { ...t, value: t.value.slice(0, -suffix.value.length) },
            { ...t, value: suffix.value },
          ]
        : [t];
    });
  charge((at.length + 1) * (bt.length + 1));
  const original = at;
  at = splitSuffix(at, bt);
  bt = splitSuffix(bt, original);
  if (at.length + bt.length > 512) return undefined;
  charge((at.length + 1) * (bt.length + 1));
  const changes = diffArrays(at, bt, {
    comparator: (x, y) => x.value === y.value,
    maxEditLength: 128,
  });
  if (!changes) return undefined;
  let ai = 0,
    bi = 0;
  return changes.flatMap((c) =>
    c.value.map((): InlinePiece =>
      c.added
        ? { after: bt![bi++]! }
        : c.removed
          ? { before: at![ai++]! }
          : { before: at![ai++]!, after: bt![bi++]! },
    ),
  );
}

interface Shell {
  before?: Element;
  after?: Element;
}
export function inlineHtml(
  pieces: InlinePiece[],
  prefix: string,
  className: string,
  operation: (
    kind: "insert" | "delete" | "replace" | "unchanged",
    before: string,
    after: string,
  ) => string,
  reserve: (units: number) => void,
): string {
  const escape = (s: string) =>
    s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  // Coalesce adjacent word tokens sharing one side and ancestry into readable spans.
  const grouped: InlinePiece[] = [];
  for (const piece of pieces) {
    const last = grouped.at(-1);
    const compatible = (a: Token | undefined, b: Token | undefined) =>
      (!a && !b) ||
      (!!a &&
        !!b &&
        !a.node &&
        !b.node &&
        a.path.length === b.path.length &&
        a.path.every((n, i) => n === b.path[i]));
    if (
      last &&
      compatible(last.before, piece.before) &&
      compatible(last.after, piece.after)
    ) {
      if (last.before && piece.before)
        last.before = {
          ...last.before,
          value: last.before.value + piece.before.value,
        };
      if (last.after && piece.after)
        last.after = {
          ...last.after,
          value: last.after.value + piece.after.value,
        };
    } else grouped.push({ ...piece });
  }
  const chunks: string[] = [];
  const append = (value: string) => {
    reserve(value.length);
    chunks.push(value);
  };
  const stack: Shell[] = [];
  const close = () => {
    const s = stack.pop()!;
    append(`</${(s.after ?? s.before)!.tagName}>`);
  };
  for (const piece of grouped) {
    const ap = piece.before?.path ?? [],
      bp = piece.after?.path ?? [];
    const desired: Shell[] = [];
    let ai = 0,
      bi = 0;
    // A one-sided edit may remain inside shells belonging to the absent side:
    // removing that edit during projection leaves those original shells intact.
    for (const shell of stack) {
      const beforeFits =
        !piece.before || (shell.before ? shell.before === ap[ai] : true);
      const afterFits =
        !piece.after || (shell.after ? shell.after === bp[bi] : true);
      if (!beforeFits || !afterFits) break;
      desired.push(shell);
      if (shell.before && piece.before) ai++;
      if (shell.after && piece.after) bi++;
    }
    while (ai < ap.length || bi < bp.length) {
      const a = ap[ai],
        b = bp[bi];
      if (a && b && signature(a) === signature(b)) {
        desired.push({ before: a, after: b });
        ai++;
        bi++;
      } else if (a) {
        desired.push({ before: a });
        ai++;
      } else if (b) {
        desired.push({ after: b });
        bi++;
      }
    }
    let common = 0;
    while (
      common < desired.length &&
      common < stack.length &&
      desired[common]!.before === stack[common]!.before &&
      desired[common]!.after === stack[common]!.after
    )
      common++;
    while (stack.length > common) close();
    for (const shell of desired.slice(common)) {
      const n = (shell.after ?? shell.before)!;
      const attrs = [...n.attrs];
      if (!shell.before || !shell.after) {
        attrs.push({
          name: `${prefix}unwrap`,
          value: shell.before ? "after" : "before",
        });
        attrs.push({
          name: `${prefix}op`,
          value: operation(
            "replace",
            shell.before ? html(n) : "",
            shell.after ? html(n) : "",
          ),
        });
      }
      const serialized = html({ ...n, attrs, childNodes: [] });
      append(serialized.slice(0, serialized.lastIndexOf(`</${n.tagName}>`)));
      stack.push(shell);
    }
    const token = (piece.after ?? piece.before)!;
    const value = token.node ? html(token.node) : escape(token.value);
    if (piece.before && piece.after) {
      append(value);
      operation("unchanged", value, value);
    } else {
      const kind = piece.after ? "insert" : "delete",
        tag = piece.after ? "ins" : "del";
      const id = operation(
        kind,
        piece.before ? value : "",
        piece.after ? value : "",
      );
      append(
        token.node && element(token.node)
          ? html({
              ...token.node,
              attrs: [
                ...token.node.attrs,
                { name: `${prefix}node`, value: kind },
                { name: `${prefix}op`, value: id },
              ],
            })
          : `<${tag} class="${className}" ${prefix}node="${kind}" ${prefix}op="${id}" ${prefix}wrapper="">${value}</${tag}>`,
      );
    }
  }
  while (stack.length) close();
  return chunks.join("");
}
