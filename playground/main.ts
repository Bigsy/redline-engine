import { compareBodies } from "../src/index.ts";

const result = compareBodies({ beforeHtml: "<p>a</p>", afterHtml: "<p>b</p>" });
console.log(result);
