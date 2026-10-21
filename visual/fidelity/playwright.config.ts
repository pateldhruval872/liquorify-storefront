import { defineConfig } from "@playwright/test";

/**
 * Compares the pilot's stories with the same components on the running
 * storefront. Start the storefront and Storybook first (see compare.spec.ts).
 */
export default defineConfig({
  testDir: ".",
  testMatch: "compare.spec.ts",
  outputDir: "./results/test-output",
  workers: 1,
  timeout: 180_000,
  reporter: "list",
  use: {
    browserName: "chromium",
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
  },
});
