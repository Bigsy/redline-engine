import type { Comparison, Diagnostic } from "../model/types.ts";

/** Render a comparison as merged redline HTML. Not implemented (PLAN.md phase 2). */
export function renderMerged(_comparison: Comparison): { html: string; diagnostics: Diagnostic[] } {
  throw new Error("renderMerged is not implemented yet.");
}
