import { describe, it, expect } from "vitest";
import { sibling } from "./sibling.ts";
import { preservation, precision, compare, parseBody } from "./check.ts";
for (const fixture of sibling)
  describe(fixture.id, () => {
    it("independent both-side DOM reconstruction", () => preservation(fixture));
    it("meaningful highlights", () => precision(fixture));
    if (fixture.id.startsWith("PL-sparse-"))
      it("all 14 sparse edits stay paragraph-local", () => {
        const body = parseBody(compare(fixture));
        for (let i = 0; i < 700; i += 50) {
          const p = [...body.querySelectorAll("p")].find((p) =>
            p.textContent.startsWith(`Paragraph ${i} `),
          );
          expect(p).toBeDefined();
          expect(
            [...p!.querySelectorAll('[data-diff-node="insert"]')]
              .map((e) => e.textContent)
              .join(" "),
            `paragraph ${i}`,
          ).toContain("was edited");
          expect(
            p!.querySelector("b [data-diff-node], a [data-diff-node]"),
          ).toBeNull();
        }
      });
  });
