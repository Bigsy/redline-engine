import { readFileSync, writeFileSync } from "node:fs";
const path = process.argv[2];
if (!path)
  throw Error("Usage: node test/compatibility/report.mjs <vitest-json-report>");
const result = JSON.parse(readFileSync(path, "utf8"));
if (
  result.testResults.length !== 3 ||
  result.testResults.some((s) => !s.assertionResults.length) ||
  result.numPendingTests ||
  result.numTotalTests !== result.numPassedTests + result.numFailedTests
)
  throw Error(
    "Incomplete acceptance run; do not replace the evidence snapshot.",
  );
const snapshot = {
  recorded: new Date().toISOString().slice(0, 10),
  node: process.version,
  platform: `${process.platform}/${process.arch}`,
  total: result.numTotalTests,
  passed: result.numPassedTests,
  failed: result.numFailedTests,
  skipped: result.numPendingTests,
  checks: result.testResults.flatMap((s) =>
    s.assertionResults.map((a) => ({
      name: a.fullName,
      status: a.status,
      ...(a.status === "failed"
        ? { failure: a.failureMessages[0].split("\n")[0] }
        : {}),
    })),
  ),
};
writeFileSync(
  new URL("results.json", import.meta.url),
  JSON.stringify(snapshot, null, 2) + "\n",
);
console.log(
  `${snapshot.passed}/${snapshot.total} passed; ${snapshot.failed} failed; ${snapshot.skipped} skipped. Update COMPATIBILITY.md when results change.`,
);
