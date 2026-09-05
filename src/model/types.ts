/**
 * Public model types. Provisional: the final shapes are a phase-1 deliverable
 * (see PLAN.md, "Separate project and integration boundary").
 */

/** Version of the operation model carried by a successful comparison. */
export const MODEL_VERSION = 0 as const;

export interface Limits {
  /** Maximum combined JavaScript string units across both bodies. */
  maxInputUnits: number;
  /** Maximum node count per side after parsing. */
  maxNodes: number;
  /** Maximum tree depth per side after parsing. */
  maxDepth: number;
  /** Comparison-wide work budget, in abstract units. */
  maxWork: number;
  /** Maximum rendered merged output size, in string units. */
  maxOutputUnits: number;
  /** Wall-clock deadline for a comparison, in milliseconds. */
  timeoutMs: number;
}

export interface Diagnostic {
  code: string;
  message: string;
  /** Operation the diagnostic refers to, when it is operation-scoped. */
  operationId?: string;
}

export interface Timings {
  parseMs: number;
  matchMs: number;
  renderMs: number;
  validateMs: number;
  totalMs: number;
}

/** Placeholder: replaced by the real operation model in phase 2. */
export interface Operation {
  id: string;
  kind: "unchanged" | "insert" | "delete" | "replace";
}

export interface Comparison {
  modelVersion: typeof MODEL_VERSION;
  operations: readonly Operation[];
  diagnostics: readonly Diagnostic[];
  timings: Timings;
}

export type ComparisonResult =
  | { outcome: "success"; comparison: Comparison }
  | { outcome: "unsupported"; diagnostics: readonly Diagnostic[] }
  | { outcome: "limit"; limit: keyof Limits; diagnostics: readonly Diagnostic[] };

export type Side = "before" | "after";
