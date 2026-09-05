import { fork } from "node:child_process";
import { writeFileSync } from "node:fs";
import { cpus, totalmem, platform, release, arch } from "node:os";
import { fixtures } from "./stage3-cases.mjs";
if (process.argv.includes("--child")) {
  const { compareBodies } = await import("../dist/index.js");
  process.on("message", ({ fixture, count }) => {
    const samples = [];
    for (let i = 0; i < count; i++) {
      const initial = process.memoryUsage();
      const start = performance.now();
      const r = compareBodies(fixture);
      process.send({ heartbeat: true });
      samples.push({
        elapsedMs: performance.now() - start,
        outcome: r.outcome,
        limit: r.limit,
        timings: r.comparison?.timings,
        outputUnits: r.comparison?.mergedHtml.length,
        operations: r.comparison?.operations.length,
        coarse: r.comparison?.diagnostics.filter(
          (d) => d.code === "coarse-replacement",
        ).length,
        heapBefore: initial.heapUsed,
        heapAfter: process.memoryUsage().heapUsed,
        rssBytes: process.memoryUsage().rss,
        peakRssKiB: process.resourceUsage().maxRSS,
      });
    }
    process.send(samples);
  });
} else {
  const rows = [];
  const run = (fixture, count) =>
    new Promise((resolve, reject) => {
      const start = performance.now();
      const child = fork(
        new URL("./stage3-node.mjs", import.meta.url),
        ["--child"],
        { stdio: ["ignore", "ignore", "inherit", "ipc"] },
      );
      let timer;
      const arm = () =>
        setTimeout(() => {
          child.kill("SIGKILL");
          resolve({
            outcome: "host-timeout",
            wallMs: performance.now() - start,
          });
        }, 15000);
      timer = arm();
      child.on("error", reject);
      child.on("message", (samples) => {
        if (samples.heartbeat) {
          clearTimeout(timer);
          timer = arm();
          return;
        }
        clearTimeout(timer);
        child.kill();
        resolve({ wallMs: performance.now() - start, samples });
      });
      child.send({ fixture, count });
    });
  for (const fixture of fixtures()) {
    const cold = [];
    for (let i = 0; i < 3; i++) cold.push(await run(fixture, 1));
    const warm = await run(fixture, 21);
    rows.push({
      name: fixture.name,
      combinedUnits: fixture.beforeHtml.length + fixture.afterHtml.length,
      cold,
      warm,
    });
    console.log(
      fixture.name,
      JSON.stringify(
        warm.samples?.map((s) => [Math.round(s.elapsedMs), s.outcome, s.limit]),
      ),
    );
    writeFileSync(
      new URL(
        process.env.STAGE3_EXTRA
          ? "./stage3-node-extra-results.json"
          : "./stage3-node-results.json",
        import.meta.url,
      ),
      JSON.stringify(
        {
          machine: {
            cpu: cpus()[0].model,
            logicalCpus: cpus().length,
            totalmem: totalmem(),
            platform: platform(),
            release: release(),
            arch: arch(),
            node: process.version,
          },
          method:
            "3 fresh process first calls; separate process with 1 warmup and 20 measured calls; 15s parent watchdog reset after each completed call; sequential fixtures; heap snapshots are not peak heap, peak RSS is process lifetime",
          rows,
        },
        null,
        2,
      ) + "\n",
    );
  }
}
