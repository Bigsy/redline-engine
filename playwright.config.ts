import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./test/browser",
  fullyParallel: false,
  workers: 1,
  use: { headless: true },
  webServer: {
    command: "pnpm run playground --host 127.0.0.1",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: false,
  },
});
