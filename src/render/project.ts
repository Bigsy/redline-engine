import type { Comparison, Side } from "../model/types.ts";

/**
 * Reconstruct one side from a comparison, for the both-sides validation the
 * correctness contract requires. Not implemented (PLAN.md phase 2).
 */
export function project(_comparison: Comparison, _side: Side): string {
  throw new Error("project is not implemented yet.");
}
