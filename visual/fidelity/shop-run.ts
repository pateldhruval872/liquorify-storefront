import type { Server } from "node:http";
import { type Page, test } from "@playwright/test";
import { signUp } from "../../e2e/support";
import {
  newPage,
  record,
  type Capture as ScreenCapture,
  type Session,
  save,
  widths,
} from "./capture";
import { proxy, startProxy } from "./proxy";

/**
 * Runs the storefront shop batch's running-screen captures
 * (`shop-screens.spec.ts`, `catalog-screens.spec.ts`). Each capture names the
 * set-up it needs, and `FIDELITY_SHOP_SETUP` says which one this run has, so
 * only that set-up's captures run. A `proxied` run starts the proxy
 * (`proxy.ts`), and a run with a customer's capture registers one first.
 */

export type Setup =
  | "standard"
  | "wholesale"
  | "proxied"
  | "prices-hidden"
  | "sign-in-required"
  | "market-added"
  | "settings-saved"
  | "product-renamed"
  | "first-run";
export type Variant = "guest" | "customer";

export interface Capture extends ScreenCapture<Variant> {
  /** The set-up the state needs; `standard` when left out. */
  setup?: Setup;
  /** The one width the state exists at; the note says why. */
  only?: (typeof widths)[number];
  /**
   * Captured at 390 pixels and then widened to 1280 without reloading, for a
   * state that one visit shows only once.
   */
  oneVisit?: true;
}

export const setup = (process.env.FIDELITY_SHOP_SETUP ?? "standard") as Setup;

/** Opens an address as given, rather than inside the default country and language. */
export async function visit(page: Page, address: string) {
  const response = await page.goto(address);
  await page.waitForLoadState("networkidle");
  const arrived = new URL(page.url()).pathname;
  return `Opened ${address}; arrived at ${arrived}, answered with status ${response?.status()}.`;
}

/**
 * Leaves the storefront's server actions unanswered, or fails them, from now
 * on. They post to the page's own address with a `Next-Action` header.
 */
export async function interceptActions(page: Page, answer: "hold" | "fail") {
  await page.route("**/*", (route) => {
    const request = route.request();
    if (request.method() !== "POST" || !request.headers()["next-action"]) {
      return route.fallback();
    }
    return answer === "fail" ? route.abort() : undefined;
  });
}

export function runCaptures(captures: Capture[]) {
  const thisRun = captures.filter(
    (item) => (item.setup ?? "standard") === setup,
  );
  const sessions: Partial<Record<Variant, Session>> = {};
  let server: Server | undefined;

  test.beforeAll(async ({ browser }) => {
    if (setup === "proxied") server = await startProxy();
    if (!thisRun.some((item) => item.variant === "customer")) return;
    const { context, page } = await newPage(browser, widths[1]);
    await signUp(page, { firstName: "Jordan", lastName: "Ellis" });
    sessions.customer = await context.storageState();
    await context.close();
  });

  test.afterAll(() => {
    server?.close();
  });

  test.afterEach(() => {
    proxy.productList = "pass";
    proxy.productFilters = "pass";
  });

  for (const item of thisRun) {
    if (item.unavailable) {
      test(`${item.screen} ${item.state} ${item.variant} unavailable`, () =>
        record(item));
      continue;
    }
    if (item.oneVisit) {
      test(`${item.screen} ${item.state} ${item.variant}`, async ({
        browser,
      }) => {
        const { context, page } = await newPage(
          browser,
          widths[0],
          sessions[item.variant],
        );
        try {
          const observed = await item.reach(page);
          await save(page, item, widths[0], observed);
          await page.setViewportSize({ width: widths[1], height: 844 });
          await save(page, item, widths[1], observed);
        } finally {
          await context.close();
        }
      });
      continue;
    }
    for (const width of item.only ? [item.only] : widths) {
      test(`${item.screen} ${item.state} ${item.variant} ${width}`, async ({
        browser,
      }) => {
        const { context, page } = await newPage(
          browser,
          width,
          sessions[item.variant],
        );
        try {
          await save(page, item, width, await item.reach(page));
        } finally {
          await context.close();
        }
      });
    }
  }
}
