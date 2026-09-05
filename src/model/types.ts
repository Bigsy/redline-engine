/**
 * Public contract, operation model version 1. See CONTRACT.md.
 */

/** Version of the operation model carried by a successful comparison. */
export const MODEL_VERSION = 1 as const;

export interface Limits {
  /** Maximum combined JavaScript string units across both bodies. */
  maxInputUnits: number;
  /** Maximum node count per side after parsing. */
  maxNodes: number;
  /** Maximum tree depth per side after parsing; hard ceiling 256. */
  maxDepth: number;
  /** Comparison-wide work budget, in abstract units. */
  maxWork: number;
  /** Maximum rendered merged output size, in string units. */
  maxOutputUnits: number;
  /** Cooperative wall-clock deadline, in milliseconds; a host watchdog is still required. */
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

/** Versioned tree edit. Container children preserve document order. */
export interface Operation {
  id: string;
  /** Containing operation; omitted for roots. */
  parentId?: string;
  kind: "unchanged" | "insert" | "delete" | "replace" | "container";
  beforeHtml: string;
  afterHtml: string;
}

export interface Comparison {
  modelVersion: typeof MODEL_VERSION;
  /** Owned marker namespace; defaults to diff for model-1 compatibility. */
  dataPrefix?: string;
  /** Validated merged HTML; project reparses this representation. */
  mergedHtml: string;
  operations: readonly Operation[];
  diagnostics: readonly Diagnostic[];
  timings: Timings;
}

export type ComparisonResult =
  | { outcome: "success"; comparison: Comparison }
  | { outcome: "unsupported"; diagnostics: readonly Diagnostic[] }
  | {
      outcome: "limit";
      limit: keyof Limits;
      diagnostics: readonly Diagnostic[];
    };

export type Side = "before" | "after";
