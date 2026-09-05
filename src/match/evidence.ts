import { children, signature, type Node } from "../parse/tree.ts";
/** Constant-width evidence only. Exact equality is still checked by the matcher. */
export function evidence(
  a: Node,
  b: Node,
  hashes: WeakMap<Node, string>,
  charge: (units?: number) => void,
): number {
  charge();
  if (signature(a) !== signature(b)) return 0;
  const ac = children(a).slice(0, 32),
    bc = children(b).slice(0, 32);
  charge(ac.length + bc.length);
  const hints = new Set(ac.map((n) => hashes.get(n)));
  return (
    1 + bc.reduce((score, n) => score + (hints.has(hashes.get(n)) ? 1 : 0), 0)
  );
}
