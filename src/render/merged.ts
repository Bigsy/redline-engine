import type { Comparison, Diagnostic } from "../model/types.ts";
export function renderMerged(comparison: Comparison): {
  html: string;
  diagnostics: Diagnostic[];
} {
  return {
    html: comparison.mergedHtml,
    diagnostics: [...comparison.diagnostics],
  };
}
