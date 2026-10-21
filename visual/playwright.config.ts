import { defineConfig } from "@playwright/test";

const port = 6008;

export default defineConfig({
  testDir: ".",
  testMatch: "stories.spec.ts",
  // visual/__screenshots__/<story id>/<mode>.png
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  outputDir: "./results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  // A missing or different reference fails the test; references change only
  // through the update script, whose images are reviewed in a pull request.
  updateSnapshots: "none",
  reporter: [["list"], ["html", { outputFolder: "./report", open: "never" }]],
  expect: {
    // Strict: Playwright's default colour tolerance for each pixel, and no
    // pixel allowed beyond it. A looser setting needs a recorded reason.
    toHaveScreenshot: {
      maxDiffPixels: 0,
      animations: "disabled",
      caret: "hide",
      scale: "css",
    },
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: "chromium",
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    contextOptions: { reducedMotion: "reduce" },
  },
  webServer: {
    command: `node stories/scripts/serve.mjs storybook-static ${port}`,
    cwd: "..",
    url: `http://127.0.0.1:${port}/index.json`,
    reuseExistingServer: !process.env.CI,
  },
});
