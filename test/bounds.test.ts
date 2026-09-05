import { describe, expect, it } from "vitest";
import { compareBodies } from "../src/index.ts";

describe("Stage 3 resource boundaries", () => {
  it("accepts the input boundary and rejects one unit over without partial output", () => {
    const beforeHtml = "x".repeat(1_000_000);
    expect(compareBodies({ beforeHtml, afterHtml: beforeHtml }).outcome).toBe(
      "success",
    );
    const result = compareBodies({ beforeHtml, afterHtml: beforeHtml + "x" });
    expect(result).toMatchObject({ outcome: "limit", limit: "maxInputUnits" });
    expect(result).not.toHaveProperty("comparison");
  });
  it("counts text leaves in the depth boundary", () => {
    const source = (n: number) => "<div>".repeat(n) + "x" + "</div>".repeat(n);
    expect(
      compareBodies({ beforeHtml: source(255), afterHtml: source(255) })
        .outcome,
    ).toBe("success");
    expect(
      compareBodies({ beforeHtml: source(256), afterHtml: source(256) }),
    ).toMatchObject({ outcome: "limit", limit: "maxDepth" });
  });
  it("reserves expansion during planning before exhausting later work", () => {
    const result = compareBodies({
      beforeHtml: "<i>a</i>".repeat(1000),
      afterHtml: "<b>b</b>".repeat(1000),
      limits: { maxOutputUnits: 100, maxWork: 150000 },
    });
    expect(result).toMatchObject({ outcome: "limit", limit: "maxOutputUnits" });
    expect(result).not.toHaveProperty("comparison");
  });
  it("accepts exact output size and rejects a one-unit smaller budget", () => {
    const input = { beforeHtml: "<p>old</p>", afterHtml: "<p>new</p>" };
    const result = compareBodies(input);
    expect(result.outcome).toBe("success");
    if (result.outcome !== "success") throw Error(result.outcome);
    const length = result.comparison.mergedHtml.length;
    expect(
      compareBodies({ ...input, limits: { maxOutputUnits: length } }),
    ).toEqual(expect.objectContaining({ outcome: "success" }));
    expect(
      compareBodies({ ...input, limits: { maxOutputUnits: length - 1 } }),
    ).toMatchObject({ outcome: "limit", limit: "maxOutputUnits" });
  });
});
