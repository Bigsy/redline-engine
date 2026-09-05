import { fixtures } from "./stage3-cases.mjs";
import { readFileSync, writeFileSync } from "node:fs";
const read = (name) =>
  JSON.parse(readFileSync(new URL(name, import.meta.url), "utf8"));
const node = read("./stage3-node-results.json"),
  browser = read("./stage3-browser-results.json"),
  before = read("./stage3-before-results.json");
const p95 = (values) =>
  values.length
    ? [...values].sort((a, b) => a - b)[Math.ceil(values.length * 0.95) - 1]
    : null;
const rows = [
  ...node.rows,
  ...read("./stage3-node-extra-results.json").rows,
].map((row) => {
  const b = [
    ...browser.rows,
    ...read("./stage3-browser-extra-results.json").rows,
  ].find((r) => r.name === row.name);
  const old = before.rows.find((r) => r.name === row.name);
  const warm = row.warm.samples?.slice(1) ?? [];
  return {
    name: row.name,
    combinedUnits: row.combinedUnits,
    outcome: row.warm.samples?.[0].outcome ?? row.warm.outcome,
    limit: row.warm.samples?.[0].limit,
    outputUnits: row.warm.samples?.[0].outputUnits,
    coldCount: row.cold.length,
    warmCount: warm.length,
    coldMaxMs: Math.max(
      ...row.cold.flatMap((r) => r.samples?.map((s) => s.elapsedMs) ?? []),
    ),
    nodeP95Ms: p95(warm.map((s) => s.elapsedMs)),
    previousNodeP95Ms: p95(
      old?.warm.samples?.slice(1).map((s) => s.elapsedMs) ?? [],
    ),
    peakRssMiB: Math.max(
      ...[...row.cold.flatMap((r) => r.samples ?? []), ...warm].map(
        (s) => s.peakRssKiB / 1024,
      ),
    ),
    browserColdRenderReadyMs: b?.samples[0].renderReadyMs,
    browserWarmP95Ms: p95(
      b?.samples.slice(1).map((s) => s.renderReadyMs) ?? [],
    ),
    startupMs: b?.samples[0].startupMs,
    browserRssSnapshotMiB: b?.browserProcessRssKiB / 1024,
    transportP95Ms: p95(
      b?.samples.slice(1).map((s) => s.transportResidualMs) ?? [],
    ),
    frameReadyP95Ms: p95(b?.samples.slice(1).map((s) => s.frameReadyMs) ?? []),
  };
});
writeFileSync(
  new URL("./stage3-summary.json", import.meta.url),
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      machine: node.machine,
      chromium: browser.chromium,
      percentile:
        "nearest rank; warm n=20 per fixture; cold n=3 Node/n=1 browser insufficient for a cold tail estimate",
      rows,
    },
    null,
    2,
  ) + "\n",
);
const fmt = (n) => (n == null ? "—" : n.toFixed(1));
console.log(
  "| Case | Units | Outcome | Node warm p95 ms | Chromium warm p95 render-ready ms | Cold Chromium ms | Peak Node RSS MiB |",
);
console.log("| --- | ---: | --- | ---: | ---: | ---: | ---: |");
for (const r of rows)
  console.log(
    `| ${r.name} | ${r.combinedUnits} | ${r.limit ?? r.outcome} | ${fmt(r.nodeP95Ms)} | ${fmt(r.browserWarmP95Ms)} | ${fmt(r.browserColdRenderReadyMs)} | ${fmt(r.peakRssMiB)} |`,
  );
const small = rows.filter((r) =>
  /^(fixture-|corpus-|edits-20-|start-20$|wrapper-20$|repeated-20$)/.test(
    r.name,
  ),
);
// Retain the original near-input guard AND the near-output guard workloads.
const large = rows.filter(
  (r) =>
    r.outcome === "success" &&
    (r.combinedUnits >= 1_000_000 || r.outputUnits >= 4_000_000),
);
const failures = [
  ...small
    .filter((r) => r.browserWarmP95Ms === null || r.browserWarmP95Ms >= 250)
    .map((r) => ({
      name: r.name,
      targetMs: 250,
      actualMs: r.browserWarmP95Ms,
    })),
  ...large
    .filter(
      (r) =>
        r.browserWarmP95Ms === null ||
        r.browserWarmP95Ms >= 2000 ||
        r.browserColdRenderReadyMs >= 2000,
    )
    .map((r) => ({
      name: r.name,
      targetMs: 2000,
      warmP95Ms: r.browserWarmP95Ms,
      coldMs: r.browserColdRenderReadyMs,
    })),
];
// Success must not disappear from timing gates by turning into an arbitrary limit.
const expectedLimits = {
  "depth-256": "maxDepth",
  "depth-300": "maxDepth",
  "depth-10000": "maxDepth",
  "nodes-near": "maxOutputUnits",
  "nodes-over": "maxNodes",
  "input-over": "maxInputUnits",
  "work-low": "maxWork",
  "output-low": "maxOutputUnits",
  "deadline-zero": "timeoutMs",
  "nodes-exact-identity": "maxWork",
  "expansion-over": "maxOutputUnits",
  "work-bounded-dense": "maxWork",
};
for (const fixture of [...fixtures(false), ...fixtures(true)]) {
  const n = [
    ...node.rows,
    ...read("./stage3-node-extra-results.json").rows,
  ].find((r) => r.name === fixture.name);
  const b = [
    ...browser.rows,
    ...read("./stage3-browser-extra-results.json").rows,
  ].find((r) => r.name === fixture.name);
  const limit = expectedLimits[fixture.name];
  const samples = [
    ...(n?.cold.flatMap((r) => r.samples ?? []) ?? []),
    ...(n?.warm.samples ?? []),
    ...(b?.samples ?? []),
  ];
  if (
    samples.length !== 45 ||
    samples.some(
      (s) => s.outcome !== (limit ? "limit" : "success") || s.limit !== limit,
    )
  )
    failures.push({
      name: fixture.name,
      expected: limit ?? "success",
      error: "Outcome or sample-count regression",
    });
}
writeFileSync(
  new URL("./stage3-gate.json", import.meta.url),
  JSON.stringify(
    {
      smallCases: small.map((r) => r.name),
      largeCases: large.map((r) => r.name),
      failures,
      passed: failures.length === 0,
      note: "Chromium synthetic render-ready timing gate only; memory ceiling and packaged JCEF are separate unresolved release gates.",
    },
    null,
    2,
  ) + "\n",
);
if (failures.length) {
  console.error(
    "Provisional performance gate failed:",
    JSON.stringify(failures),
  );
  process.exitCode = 1;
}
