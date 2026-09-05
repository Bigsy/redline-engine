import type { Limits } from "./types.ts";

/**
 * Stage 3 measured resource envelope; see bench/STAGE3.md. These caps bound
 * admitted work/output, not parser preemption, render latency or process memory.
 * Hosts must still terminate workers at 15 seconds. The release gate remains open.
 */
export const DEFAULT_LIMITS: Limits = {
  maxInputUnits: 2_000_000,
  maxNodes: 200_000,
  maxDepth: 256,
  maxWork: 50_000_000,
  maxOutputUnits: 8_000_000,
  timeoutMs: 15_000,
};
