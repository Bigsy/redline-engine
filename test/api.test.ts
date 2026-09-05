import { describe, expect, it } from "vitest";
import { compareBodies, DEFAULT_LIMITS } from "../src/index.ts";

describe("compareBodies", () => {
  it("reports an explicit unsupported outcome while the engine is a stub", () => {
    const result = compareBodies({ beforeHtml: "<p>a</p>", afterHtml: "<p>b</p>" });
    expect(result.outcome).toBe("unsupported");
  });

  it("reports a limit outcome instead of attempting oversized input", () => {
    const big = "x".repeat(DEFAULT_LIMITS.maxInputUnits);
    const result = compareBodies({ beforeHtml: big, afterHtml: big });
    expect(result).toMatchObject({ outcome: "limit", limit: "maxInputUnits" });
  });
});
