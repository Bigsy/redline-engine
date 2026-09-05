import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "happy-dom",
    exclude: ["test/browser/**"],
    include: ["test/**/*.test.ts", "src/**/*.test.ts"],
  },
});
