import { compareBodies } from "../dist/index.js";
import htmldiff from "./vendor/htmldiff.js";
import { diffWordsWithSpace } from "diff";
let input = "";
for await (const chunk of process.stdin) input += chunk;
const { engine, before, after } = JSON.parse(input);
const start = performance.now();
let result;
if (engine === "structural")
  result = compareBodies({ beforeHtml: before, afterHtml: after });
else if (engine === "legacy")
  result = {
    html: htmldiff(
      before,
      after,
      "redline",
      null,
      "iframe,object,math,svg,script,video,style",
    ),
  };
else {
  const changes = diffWordsWithSpace(before, after, {
    maxEditLength: 128,
    timeout: 1000,
  });
  result = {
    outcome: changes ? "matched" : "local-limit",
    parts: changes?.length,
  };
}
process.stdout.write(
  JSON.stringify({
    elapsedMs: performance.now() - start,
    maxRssKiB: process.resourceUsage().maxRSS,
    result,
  }),
);
