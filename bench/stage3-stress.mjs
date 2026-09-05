import { fork } from "node:child_process";
import { writeFileSync } from "node:fs";
if (process.argv.includes("--child")) {
  const { compareBodies } = await import("../dist/index.js");
  const source = "<div>".repeat(80000) + "x" + "</div>".repeat(80000);
  const start = performance.now();
  const result = compareBodies({ beforeHtml: source, afterHtml: source });
  process.send({ elapsedMs: performance.now() - start, result });
} else {
  const start = performance.now();
  const child = fork(
    new URL("./stage3-stress.mjs", import.meta.url),
    ["--child"],
    { stdio: ["ignore", "ignore", "inherit", "ipc"] },
  );
  const result = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve({
        outcome: "host-terminated",
        elapsedMs: performance.now() - start,
      });
    }, 15000);
    child.on("message", (r) => {
      clearTimeout(timer);
      child.kill();
      resolve(r);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ error: String(error) });
    });
  });
  writeFileSync(
    new URL("./stage3-stress-results.json", import.meta.url),
    JSON.stringify(
      {
        method:
          "Actual engine, 80000 nested divs per side, 1760002 combined units, fresh process, parent SIGKILL at 15000ms including startup",
        result,
      },
      null,
      2,
    ) + "\n",
  );
  console.log(result);
}
