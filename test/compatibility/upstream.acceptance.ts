import { describe, it, expect } from "vitest";
import { compareBodies, renderMerged, project } from "../../src/index.ts";
import fixtures from "./upstream.json";
import { preservation, precision } from "./check.ts";
for (const fixture of fixtures)
  describe(fixture.id, () => {
    it("independent both-side DOM reconstruction", () => preservation(fixture));
    it("meaningful highlights and unchanged context", () => precision(fixture));
  });
it("UP-module#01 documented public API", () => {
  for (const fn of [compareBodies, renderMerged, project])
    expect(fn).toBeTypeOf("function");
});
