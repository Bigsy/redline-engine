import { writeFileSync } from "node:fs";
import { test, expect } from "@playwright/test";

test("host terminates a noncooperative worker at the real 15-second deadline", async ({
  page,
}) => {
  test.setTimeout(25000);
  await page.addInitScript(() => {
    const RealWorker = window.Worker;
    // Exercise the actual playground watchdog, with a worker that cannot cooperate.
    window.Worker = class extends RealWorker {
      constructor() {
        super(
          URL.createObjectURL(
            new Blob(["onmessage=()=>{while(true){}}"], {
              type: "text/javascript",
            }),
          ),
        );
        (window as unknown as { workerStartedAt: number }).workerStartedAt =
          performance.now();
      }
      override terminate() {
        (window as unknown as { terminatedAt: number }).terminatedAt =
          performance.now();
        super.terminate();
      }
    };
  });
  await page.goto("http://127.0.0.1:5173");
  await expect(page.locator("#status")).toHaveText("Comparing in worker…");
  const start = await page.evaluate(
    () => (window as unknown as { workerStartedAt: number }).workerStartedAt,
  );
  await expect(page.locator("#status")).toHaveText("Worker deadline exceeded", {
    timeout: 18000,
  });
  const elapsed =
    (await page.evaluate(
      () => (window as unknown as { terminatedAt: number }).terminatedAt,
    )) - start;
  writeFileSync(
    new URL("../../bench/stage3-watchdog-results.json", import.meta.url),
    JSON.stringify(
      {
        date: new Date().toISOString(),
        elapsedMs: elapsed,
        deadlineMs: 15000,
        method:
          "Actual playground watchdog; injected worker loops synchronously; real clock, no fake timers. Elapsed measured from worker construction.",
      },
      null,
      2,
    ) + "\n",
  );
  expect(elapsed).toBeGreaterThan(14000);
  expect(elapsed).toBeLessThan(16500);
  await page.click("#compare");
  await page.click("#cancel");
  await expect(page.locator("#status")).toHaveText("Cancelled");
});
