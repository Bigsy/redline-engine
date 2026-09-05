import { compareBodies, renderMerged } from "redline-engine";
self.onmessage = ({ data }) => {
  const result = compareBodies(data);
  self.postMessage(
    result.outcome === "success"
      ? {
          outcome: "success",
          ...renderMerged(result.comparison),
          timings: result.comparison.timings,
        }
      : result,
  );
};
