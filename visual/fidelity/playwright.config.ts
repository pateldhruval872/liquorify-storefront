import { defineConfig } from "@playwright/test";

/**
 * Compares stories with the same components on the running storefront
 * (compare.spec.ts), and captures the running screens in each state
 * (screens.spec.ts). Start the servers each file names first. `mail.spec.ts`
 * follows the storefront's password reset email, and runs only against a
 * storefront set up to write its email to a folder (see that file).
 */
export default defineConfig({
  testDir: ".",
  testMatch: ["compare.spec.ts", "screens.spec.ts", "mail.spec.ts"],
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
