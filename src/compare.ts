import { diffArrays } from "diff";
import { inlinePieces, inlineHtml } from "./match/inline.ts";
import { evidence } from "./match/evidence.ts";
import { DEFAULT_LIMITS } from "./model/limits.ts";
import {
  MODEL_VERSION,
  type ComparisonResult,
  type Limits,
  type Operation,
  type Diagnostic,
} from "./model/types.ts";
import {
  parse,
  html,
  children,
  element,
  signature,
  sameTree,
  type Node,
} from "./parse/tree.ts";
import { renderPlan, type RenderPlan } from "./render/plan.ts";
import { projectTree } from "./render/project.ts";
export interface CompareBodiesInput {
  beforeHtml: string;
  afterHtml: string;
  limits?: Partial<Limits>;
  className?: string;
  dataPrefix?: string;
  atomicTags?: readonly string[];
}
class Stop extends Error {
  constructor(readonly limit: keyof Limits) {
    super(limit);
  }
}
class Unsupported extends Error {}
const containers = new Set(
  "div section article main aside header footer nav blockquote p h1 h2 h3 h4 h5 h6 ul ol li table thead tbody tfoot tr td th caption dl dt dd span strong em b i u s a small sub sup".split(
    " ",
  ),
);
const inlineParents = new Set(
  "body p h1 h2 h3 h4 h5 h6 li td th caption div section article blockquote span strong em b i u s a small sub sup".split(
    " ",
  ),
);
const tokenize = (s: string, maxTokens: number): string[] | undefined => {
  const tokens: string[] = [];
  for (const token of s.matchAll(
    /[\p{L}\p{N}\p{M}]+|\s+|[^\p{L}\p{N}\p{M}\s]/gu,
  )) {
    if (tokens.length >= maxTokens) return undefined;
    tokens.push(token[0]);
  }
  return tokens;
};
const escape = (s: string) =>
  s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

export function compareBodies(input: CompareBodiesInput): ComparisonResult {
  const start = performance.now();
  const limits = { ...DEFAULT_LIMITS, ...input.limits };
  const className = input.className === undefined ? "redline" : input.className;
  const dataPrefix = input.dataPrefix === undefined ? "diff" : input.dataPrefix;
  const prefix = `data-${dataPrefix}-`;
  const atomicTags = new Set(
    Array.isArray(input.atomicTags) ? input.atomicTags : [],
  );
  const diagnostics: Diagnostic[] = [];
  const operations: Operation[] = [];
  let work = 0,
    output = 0;
  const charge = (n = 1) => {
    work += n;
    if (work > limits.maxWork) throw new Stop("maxWork");
    if (performance.now() - start > limits.timeoutMs)
      throw new Stop("timeoutMs");
  };
  // Reserve while constructing the plan, before retaining further payloads.
  const emit = (s: string): RenderPlan => {
    output += s.length;
    if (output > limits.maxOutputUnits) throw new Stop("maxOutputUnits");
    return () => s;
  };
  try {
    if (
      typeof className !== "string" ||
      !/^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(className)
    )
      throw new Unsupported(
        "Invalid className; expected one CSS class identifier.",
      );
    if (
      typeof dataPrefix !== "string" ||
      !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(dataPrefix)
    )
      throw new Unsupported("Invalid dataPrefix.");
    if (
      input.atomicTags !== undefined &&
      (!Array.isArray(input.atomicTags) ||
        input.atomicTags.some(
          (t) =>
            typeof t !== "string" || !/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(t),
        ))
    )
      throw new Unsupported(
        "Invalid atomicTags; expected exact lowercase tag names.",
      );
    for (const [key, value] of Object.entries(limits)) {
      if (!Number.isFinite(value) || value < 0)
        throw new Unsupported(`Invalid limit ${key}.`);
    }
    if (input.beforeHtml.length + input.afterHtml.length > limits.maxInputUnits)
      throw new Stop("maxInputUnits");
    charge();
    const before = parse(input.beforeHtml),
      after = parse(input.afterHtml);
    const hashes = new WeakMap<Node, string>();
    const inspect = (nodes: Node[]) => {
      const stack = nodes.map((node) => ({ node, depth: 1, visited: false }));
      let count = 0;
      while (stack.length) {
        charge();
        const { node, depth, visited } = stack.pop()!;
        if (!visited) {
          if (++count > limits.maxNodes) throw new Stop("maxNodes");
          if (depth > Math.min(limits.maxDepth, 256))
            throw new Stop("maxDepth");
          if (
            element(node) &&
            node.attrs.some((a) => a.name.startsWith(prefix))
          )
            throw new Unsupported(`Input uses reserved ${prefix}* attributes.`);
          stack.push({ node, depth, visited: true });
          for (const child of children(node))
            stack.push({ node: child, depth: depth + 1, visited: false });
        } else {
          const value =
            signature(node) +
            (element(node)
              ? children(node)
                  .map((n) => hashes.get(n))
                  .join(",")
              : html(node));
          charge(value.length);
          let hash = 2166136261;
          for (let i = 0; i < value.length; i++)
            hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
          hashes.set(node, String(hash >>> 0));
        }
      }
    };
    inspect(before.childNodes);
    inspect(after.childNodes);
    const parsed = performance.now();
    const equal = (a: Node, b: Node): boolean => {
      if (hashes.get(a) !== hashes.get(b)) return false;
      const pairs: [Node, Node][] = [[a, b]];
      while (pairs.length) {
        charge();
        const [x, y] = pairs.pop()!;
        if (signature(x) !== signature(y)) return false;
        if (!element(x) && html(x) !== html(y)) return false;
        const xc = children(x),
          yc = children(y);
        if (xc.length !== yc.length) return false;
        for (let i = 0; i < xc.length; i++) pairs.push([xc[i]!, yc[i]!]);
      }
      return true;
    };
    let parentId: string | undefined;
    const op = (kind: Operation["kind"], a: string, b: string) => {
      const id = `op-${operations.length + 1}`;
      operations.push({
        id,
        kind,
        beforeHtml: a,
        afterHtml: b,
        ...(parentId ? { parentId } : {}),
      });
      return id;
    };
    const mark = (
      node: Node,
      kind: "insert" | "delete",
      id: string,
    ): RenderPlan => {
      if (!element(node)) {
        return emit(
          `<${kind === "insert" ? "ins" : "del"} class="${className}" ${prefix}node="${kind}" ${prefix}op="${id}" ${prefix}wrapper="">${html(node)}</${kind === "insert" ? "ins" : "del"}>`,
        );
      }
      const clone = {
        ...node,
        attrs: [
          ...node.attrs,
          { name: `${prefix}node`, value: kind },
          { name: `${prefix}op`, value: id },
        ],
      };
      return emit(html(clone));
    };
    const replacement = (a?: Node, b?: Node): RenderPlan => {
      const id = op(
        a && b ? "replace" : a ? "delete" : "insert",
        a ? html(a) : "",
        b ? html(b) : "",
      );
      if (a && b)
        diagnostics.push({
          code: "coarse-replacement",
          message: "Replaced the smallest matched safe subtree.",
          operationId: id,
        });
      return [a ? mark(a, "delete", id) : "", b ? mark(b, "insert", id) : ""];
    };
    const pair = (a: Node, b: Node, parent: string): RenderPlan => {
      charge();
      if (equal(a, b)) {
        const s = html(b);
        op("unchanged", s, s);
        return emit(s);
      }
      if (
        a.nodeName === "#text" &&
        b.nodeName === "#text" &&
        inlineParents.has(parent)
      ) {
        const av = "value" in a ? a.value : "",
          bv = "value" in b ? b.value : "";
        charge(av.length + bv.length);
        const at = tokenize(av, 512);
        const bt = at ? tokenize(bv, 512 - at.length) : undefined;
        if (at && bt) {
          charge((at.length + 1) * (bt.length + 1));
          const changes = diffArrays(at, bt, { maxEditLength: 128 });
          if (changes)
            return changes.map((c) => {
              const s = escape(c.value.join(""));
              if (!c.added && !c.removed) {
                op("unchanged", s, s);
                return emit(s);
              }
              const kind = c.added ? "insert" : "delete",
                tag = c.added ? "ins" : "del";
              const id = op(kind, c.removed ? s : "", c.added ? s : "");
              return emit(
                `<${tag} class="${className}" ${prefix}node="${kind}" ${prefix}op="${id}" ${prefix}wrapper="">${s}</${tag}>`,
              );
            });
        }
      }
      if (
        element(a) &&
        element(b) &&
        signature(a) === signature(b) &&
        a.namespaceURI === "http://www.w3.org/1999/xhtml" &&
        containers.has(a.tagName) &&
        !atomicTags.has(a.tagName)
      ) {
        if (!inlineParents.has(a.tagName)) {
          const ac = children(a).filter((n) => !element(n));
          const bc = children(b).filter((n) => !element(n));
          if (ac.length !== bc.length || ac.some((n, i) => !equal(n, bc[i]!)))
            return replacement(a, b);
        }
        // Serialize an empty clone for parser-correct attributes and tag syntax.
        const shell = html({ ...b, childNodes: [] });
        const split = shell.lastIndexOf(`</${b.tagName}>`);
        const previousParent = parentId;
        parentId = op("container", "", "");
        const content = align(children(a), children(b), a.tagName);
        parentId = previousParent;
        return [emit(shell.slice(0, split)), content, emit(shell.slice(split))];
      }
      return replacement(a, b);
    };
    const align = (a: Node[], b: Node[], parent: string): RenderPlan => {
      charge(a.length + b.length);
      if (inlineParents.has(parent) && (a.length > 1 || b.length > 1)) {
        const pieces = inlinePieces(a, b, atomicTags, charge);
        if (pieces) {
          const checkpoint = operations.length;
          let candidateUnits = 0;
          const candidate = inlineHtml(
            pieces,
            prefix,
            className,
            op,
            (units) => {
              charge(units);
              candidateUnits += units;
              if (candidateUnits > limits.maxOutputUnits)
                throw new Stop("maxOutputUnits");
            },
          );
          // Crossed formatting ranges cannot always share a single valid HTML tree.
          // Accept refinement only when both original local trees survive reparsing.
          charge(candidate.length);
          if (
            sameTree(
              a,
              projectTree(candidate, "before", dataPrefix).childNodes,
              charge,
            ) &&
            sameTree(
              b,
              projectTree(candidate, "after", dataPrefix).childNodes,
              charge,
            )
          )
            return emit(candidate);
          operations.length = checkpoint;
        }
      }
      const positions = (nodes: Node[]) => {
        const map = new Map<string, number>();
        nodes.forEach((node, i) => {
          const h = hashes.get(node)!;
          map.set(h, map.has(h) ? -1 : i);
        });
        return map;
      };
      const ap = positions(a),
        bp = positions(b);
      const candidates: [number, number][] = [];
      a.forEach((n, i) => {
        const h = hashes.get(n)!,
          j = bp.get(h);
        if (ap.get(h) === i && j !== undefined && j >= 0 && equal(n, b[j]!))
          candidates.push([i, j]);
      });
      // Patience/LIS anchors: O(n log n), no all-pairs sibling matrix.
      const tails: number[] = [],
        previous: number[] = [];
      candidates.forEach((c, i) => {
        let lo = 0,
          hi = tails.length;
        while (lo < hi) {
          charge();
          const mid = (lo + hi) >>> 1;
          if (candidates[tails[mid]!]![1] < c[1]) lo = mid + 1;
          else hi = mid;
        }
        previous[i] = lo ? tails[lo - 1]! : -1;
        tails[lo] = i;
      });
      const anchors: [number, number][] = [];
      let cursor = tails.at(-1) ?? -1;
      while (cursor >= 0) {
        anchors.push(candidates[cursor]!);
        cursor = previous[cursor]!;
      }
      anchors.reverse();
      anchors.push([a.length, b.length]);
      const chunks: RenderPlan[] = [];
      let ai = 0,
        bi = 0;
      for (const [ax, bx] of anchors) {
        while (ai < ax && bi < bx) {
          // A small lookahead can recognize an inserted row from an unchanged cell.
          // Only skip when evidence improves; ties retain stable document order.
          const current = evidence(a[ai]!, b[bi]!, hashes, charge);
          let skipBefore = 0,
            skipAfter = 0,
            best = current;
          if (ax - ai !== bx - bi && element(a[ai]!) && element(b[bi]!)) {
            for (let offset = 1; offset <= 4; offset++) {
              if (bi + offset < bx) {
                const score = evidence(a[ai]!, b[bi + offset]!, hashes, charge);
                if (score > best) {
                  best = score;
                  skipAfter = offset;
                  skipBefore = 0;
                }
              }
              if (ai + offset < ax) {
                const score = evidence(a[ai + offset]!, b[bi]!, hashes, charge);
                if (score > best) {
                  best = score;
                  skipBefore = offset;
                  skipAfter = 0;
                }
              }
            }
          }
          while (skipBefore-- > 0) chunks.push(replacement(a[ai++]));
          while (skipAfter-- > 0) chunks.push(replacement(undefined, b[bi++]));
          chunks.push(pair(a[ai++]!, b[bi++]!, parent));
        }
        while (ai < ax) chunks.push(replacement(a[ai++]));
        while (bi < bx) chunks.push(replacement(undefined, b[bi++]));
        if (ax < a.length) {
          chunks.push(pair(a[ax]!, b[bx]!, parent));
          ai = ax + 1;
          bi = bx + 1;
        }
      }
      return chunks;
    };
    const plan = align(before.childNodes, after.childNodes, "body");
    const matched = performance.now();
    const mergedHtml = renderPlan(plan, charge);
    const rendered = performance.now();
    charge(mergedHtml.length);
    if (
      !sameTree(
        before.childNodes,
        projectTree(mergedHtml, "before", dataPrefix).childNodes,
        charge,
      ) ||
      !sameTree(
        after.childNodes,
        projectTree(mergedHtml, "after", dataPrefix).childNodes,
        charge,
      )
    )
      throw new Unsupported(
        "Merged HTML does not preserve both canonical projections after parsing.",
      );
    charge();
    const done = performance.now();
    if (
      operations.some((o) => o.kind !== "unchanged" && o.kind !== "container")
    )
      diagnostics.push({
        code: "appearance-caveat",
        message:
          "Body structure is preserved; host styles, hidden nodes and duplicate IDs may affect merged appearance.",
      });
    return {
      outcome: "success",
      comparison: {
        modelVersion: MODEL_VERSION,
        dataPrefix,
        operations,
        mergedHtml,
        diagnostics,
        timings: {
          parseMs: parsed - start,
          matchMs: matched - parsed,
          renderMs: rendered - matched,
          validateMs: done - rendered,
          totalMs: done - start,
        },
      },
    };
  } catch (error) {
    if (error instanceof Stop)
      return {
        outcome: "limit",
        limit: error.limit,
        diagnostics: [
          {
            code: "limit-exceeded",
            message: `Comparison exceeded ${error.limit}.`,
          },
        ],
      };
    if (error instanceof Unsupported)
      return {
        outcome: "unsupported",
        diagnostics: [
          { code: "unsupported-representation", message: error.message },
        ],
      };
    throw error;
  }
}
