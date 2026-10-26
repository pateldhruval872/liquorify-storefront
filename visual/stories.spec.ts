import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { FIXTURE_NOW } from "../stories/fixtures/clock";
import { modes, systemDarkMode } from "./modes";

interface IndexEntry {
  id: string;
  title: string;
  name: string;
  type: "story" | "docs";
  tags?: string[];
}

const index: { entries: Record<string, IndexEntry> } = JSON.parse(
  readFileSync(path.join(__dirname, "../storybook-static/index.json"), "utf8"),
);
const stories = Object.values(index.entries).filter(
  (entry) => entry.type === "story",
);
const fontsFolder = path.join(__dirname, "fonts");

declare global {
  interface Window {
    __STORYBOOK_ADDONS_CHANNEL__?: {
      last(eventName: string): { message?: string }[] | undefined;
    };
    __STORYBOOK_PREVIEW__?: {
      currentRender?: {
        phase?: string;
        story?: { parameters?: Record<string, any> };
      };
    };
  }
}

const screenshotOptions = {
  animations: "disabled",
  caret: "hide",
  scale: "css",
} as const;

/**
 * A screenshot once two in a row are identical, as Playwright's own
 * comparison waits for.
 */
async function stableScreenshot(target: Page | Locator): Promise<Buffer> {
  let previous = await target.screenshot(screenshotOptions);
  for (let attempt = 0; attempt < 10; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    const current = await target.screenshot(screenshotOptions);
    if (current.equals(previous)) return current;
    previous = current;
  }
  throw new Error("The story kept changing between screenshots");
}

/**
 * Token pages are reference tables, captured at the desktop width only;
 * stories tagged system-dark are also captured with the system dark setting.
 */
function modesFor(tags: string[]) {
  const widths = tags.includes("desktop-only")
    ? modes.filter((mode) => mode.name === "desktop")
    : modes;
  return tags.includes("system-dark") ? [...widths, systemDarkMode] : widths;
}

for (const story of stories) {
  const storyModes = modesFor(story.tags ?? []);
  for (const mode of storyModes) {
    test(`${story.title} / ${story.name} / ${mode.name}`, async ({
      page,
      baseURL,
    }, testInfo) => {
      // Requests that leave the local server are blocked and fail the test,
      // except Geist, which is served from the copies in visual/fonts.
      const outside: string[] = [];
      await page.context().route(
        (url) => url.origin !== baseURL,
        (route) => {
          const url = new URL(route.request().url());
          const font = path.join(fontsFolder, path.basename(url.pathname));
          if (
            url.origin === "https://fonts.gstatic.com" &&
            url.pathname.startsWith("/s/geist/v5/") &&
            existsSync(font)
          ) {
            return route.fulfill({ path: font, contentType: "font/woff2" });
          }
          outside.push(url.href);
          return route.abort();
        },
      );

      await page.setViewportSize({ width: mode.width, height: 844 });
      await page.emulateMedia({
        colorScheme: mode.colorScheme,
        reducedMotion: "reduce",
      });
      await page.clock.setFixedTime(FIXTURE_NOW);
      await page.goto(`/iframe.html?id=${story.id}&viewMode=story`);

      // Storybook has rendered the story and run its play function, or failed.
      await page.waitForFunction(() =>
        ["completed", "finished", "afterEach", "errored", "aborted"].includes(
          window.__STORYBOOK_PREVIEW__?.currentRender?.phase ?? "",
        ),
      );
      const phase = await page.evaluate(
        () => window.__STORYBOOK_PREVIEW__?.currentRender?.phase,
      );
      expect(phase, "the story rendered without an error").not.toMatch(
        /errored|aborted/,
      );
      // A failing play function still ends the render as finished, so its
      // error is read from the last one Storybook announced.
      const playError = await page.evaluate(
        () =>
          window.__STORYBOOK_ADDONS_CHANNEL__?.last(
            "playFunctionThrewException",
          )?.[0]?.message,
      );
      expect(playError, "the story's play function passed").toBeUndefined();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForLoadState("networkidle");

      // A drawer or popup renders outside the story's root, so its story captures the viewport.
      const { capture, layout } = await page.evaluate(() => {
        const parameters =
          window.__STORYBOOK_PREVIEW__?.currentRender?.story?.parameters;
        return {
          capture: parameters?.liquorify?.capture,
          layout: parameters?.layout,
        };
      });
      // A focus ring or shadow paints past the root, so the root is captured
      // with room around it, taken from the padded layout's own padding
      // without moving the story.
      if (capture !== "viewport" && layout === "padded") {
        await page.addStyleTag({
          content: "#storybook-root { margin: -8px; padding: 8px; }",
        });
      }
      const target =
        capture === "viewport" ? page : page.locator("#storybook-root");
      const name = [story.id, `${mode.name}.png`];

      // Playwright writes nothing for a missing reference when it may not
      // update references, as in CI, so the image is saved for a person to
      // review and copy into the repository in a pull request.
      const reference = testInfo.snapshotPath(...name);
      if (
        testInfo.config.updateSnapshots === "none" &&
        !existsSync(reference)
      ) {
        const proposed = testInfo.outputPath("proposed", ...name);
        mkdirSync(path.dirname(proposed), { recursive: true });
        writeFileSync(proposed, await stableScreenshot(target));
        await testInfo.attach("proposed reference", {
          path: proposed,
          contentType: "image/png",
        });
        throw new Error(
          `No reference image yet for ${name.join("/")}; a proposed one is attached`,
        );
      }
      await expect(target).toHaveScreenshot(name);

      expect(outside, "no request left the local Storybook server").toEqual([]);
    });
  }
}
