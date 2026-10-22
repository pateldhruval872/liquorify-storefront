import { defineConfig } from "@playwright/test";

/**
 * Compares stories with the same components on the running storefront
 * (compare.spec.ts), and captures the running screens in each state
 * (screens.spec.ts). Start the servers each file names first.
 */
export default defineConfig({
  testDir: ".",
  testMatch: ["compare.spec.ts", "screens.spec.ts"],
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
