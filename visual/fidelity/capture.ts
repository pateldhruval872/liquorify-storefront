import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  Browser,
  BrowserContextOptions,
  Locator,
  Page,
} from "@playwright/test";
import { BASE_PATH } from "../../e2e/support";

/**
 * What the running-screen captures share (`screens.spec.ts`,
 * `shop-screens.spec.ts`). Each capture is saved as
 * `results/screens/<screen ID>/<state>/<variant>-light-<width>.png`, with a JSON
 * file that records how the state was reached. The storefront has no dark mode,
 * so captures are light only, at the two widths of its stories, of the whole
 * page unless a dialog is open.
 */

export const STOREFRONT = "http://localhost:3001";
export const widths = [390, 1280] as const;

const results = path.join(__dirname, "results/screens/");
const revision = process.env.FIDELITY_REVISION ?? null;

export type Session = Exclude<BrowserContextOptions["storageState"], string>;

export interface Capture<Variant extends string> {
  screen: string;
  state: string;
  variant: Variant;
  /** What the capture shows that the record must explain. */
  note?: string;
  /** Captures the window rather than the whole page, for an open dialog. */
  window?: true;
  /** Captures only this part of the page, such as the footer. */
  part?: (page: Page) => Locator;
  /** Why the state cannot be captured on this run. */
  unavailable?: string;
  /**
   * Opens the screen in the state; the browser is already signed in as the
   * variant. Answers, as text, anything the browser observed that a picture
   * cannot show.
   */
  reach: (page: Page) => Promise<unknown>;
}

export async function open(page: Page, route: string) {
  await page.goto(`${BASE_PATH}${route}`);
  await page.waitForLoadState("networkidle");
}

export async function newPage(
  browser: Browser,
  width: number,
  session?: Session,
) {
  const context = await browser.newContext({
    baseURL: STOREFRONT,
    viewport: { width, height: 844 },
    deviceScaleFactor: 1,
    locale: "en-US",
    timezoneId: "UTC",
    reducedMotion: "reduce",
    storageState: session,
  });
  return { context, page: await context.newPage() };
}

export async function save<Variant extends string>(
  page: Page,
  item: Capture<Variant>,
  width: number,
  observed: unknown,
) {
  const folder = `${results}${item.screen}/${item.state}/`;
  const file = `${folder}${item.variant}-light-${width}`;
  mkdirSync(folder, { recursive: true });
  // A page scrolled by the state would draw its sticky header part way down
  // a whole-page capture, or over a part of it.
  if (!item.window) await page.evaluate(() => window.scrollTo(0, 0));
  await page.mouse.move(0, 0);
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `${file}.png`,
    animations: "disabled",
    fullPage: !item.window,
    clip: (await item.part?.(page).boundingBox()) ?? undefined,
  });
  writeFileSync(
    `${file}.json`,
    JSON.stringify(
      {
        screen: item.screen,
        state: item.state,
        variant: item.variant,
        theme: "light",
        width,
        revision,
        path: new URL(page.url()).pathname,
        observed: typeof observed === "string" ? observed : null,
        note: item.note ?? null,
      },
      null,
      2,
    ),
  );
}

export function record<Variant extends string>(item: Capture<Variant>) {
  const folder = `${results}${item.screen}/${item.state}/`;
  mkdirSync(folder, { recursive: true });
  writeFileSync(
    `${folder}${item.variant}-unavailable.json`,
    JSON.stringify(
      {
        screen: item.screen,
        state: item.state,
        variant: item.variant,
        revision,
        unavailable: item.unavailable,
      },
      null,
      2,
    ),
  );
}
