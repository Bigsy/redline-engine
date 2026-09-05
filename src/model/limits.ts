import type { Limits } from "./types.ts";

/**
 * Provisional caps. PLAN.md phase 4 requires these be set from spike
 * measurements before release; they are placeholders until then.
 */
export const DEFAULT_LIMITS: Limits = {
  maxInputUnits: 2_000_000,
  maxNodes: 200_000,
  maxDepth: 512,
  maxWork: 50_000_000,
  maxOutputUnits: 8_000_000,
  timeoutMs: 15_000,
};
