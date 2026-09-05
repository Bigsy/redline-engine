export { MODEL_VERSION } from "./model/types.ts";
export type {
  Comparison,
  ComparisonResult,
  Diagnostic,
  Limits,
  Operation,
  Side,
  Timings,
} from "./model/types.ts";
export { DEFAULT_LIMITS } from "./model/limits.ts";
export type { CompareBodiesInput } from "./compare.ts";
export { compareBodies } from "./compare.ts";
export { renderMerged } from "./render/merged.ts";
export { project } from "./render/project.ts";
