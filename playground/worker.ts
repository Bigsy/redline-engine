import { compareBodies, renderMerged } from "../src/index.ts";
import type { CompareBodiesInput } from "../src/compare.ts";
const ctx = self as unknown as {
  onmessage: (event: MessageEvent<CompareBodiesInput>) => void;
  postMessage: (data: unknown) => void;
};
ctx.onmessage = ({ data }) => {
  try {
    const result = compareBodies(data);
    ctx.postMessage(
      result.outcome === "success"
        ? { ...result, rendered: renderMerged(result.comparison) }
        : result,
    );
  } catch (error) {
    ctx.postMessage({
      outcome: "unsupported",
      diagnostics: [{ code: "worker-error", message: String(error) }],
    });
  }
};
