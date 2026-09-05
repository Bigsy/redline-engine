import { DEFAULT_LIMITS } from "./model/limits.ts";
import type { ComparisonResult, Limits } from "./model/types.ts";

export interface CompareBodiesInput {
  beforeHtml: string;
  afterHtml: string;
  limits?: Partial<Limits>;
}

/**
 * Compare two sanitized body strings.
 *
 * Not implemented: phase 2 in PLAN.md builds parse -> align -> operations.
 * Until then every call reports an unsupported outcome, so hosts exercise the
 * fallback path rather than trusting an empty comparison.
 */
export function compareBodies(input: CompareBodiesInput): ComparisonResult {
  const limits: Limits = { ...DEFAULT_LIMITS, ...input.limits };
  const units = input.beforeHtml.length + input.afterHtml.length;
  if (units > limits.maxInputUnits) {
    return {
      outcome: "limit",
      limit: "maxInputUnits",
      diagnostics: [
        {
          code: "input-too-large",
          message: `Combined input is ${units} string units; the limit is ${limits.maxInputUnits}.`,
        },
      ],
    };
  }
  return {
    outcome: "unsupported",
    diagnostics: [
      { code: "not-implemented", message: "The structural engine is not implemented yet." },
    ],
  };
}
