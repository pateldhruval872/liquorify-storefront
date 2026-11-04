import type { Page } from "@playwright/test";
import { save } from "./capture";

/**
 * What the scripts that save settings through the dashboard share
 * (`settings.spec.ts`, `checkout-settings.spec.ts`). Serve the built dashboard
 * at `FIDELITY_DASHBOARD` (default `http://localhost:5174`) against the
 * storefront's backend, and give an admin's sign-in in `FIDELITY_ADMIN_EMAIL`
 * and `FIDELITY_ADMIN_PASSWORD`; neither has a default.
 */

export const dashboard =
  process.env.FIDELITY_DASHBOARD ?? "http://localhost:5174";

export const sheet = (page: Page) => page.getByRole("dialog");

/** Signs in on the dashboard's own form and answers the store's ID. */
export async function signIn(page: Page) {
  const email = process.env.FIDELITY_ADMIN_EMAIL;
  const password = process.env.FIDELITY_ADMIN_PASSWORD;
  if (!email || !password) {
    throw new Error("Set FIDELITY_ADMIN_EMAIL and FIDELITY_ADMIN_PASSWORD");
  }
  await page.goto("/");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/store_/);
  return new URL(page.url()).pathname.split("/")[1];
}

export async function openSettings(page: Page, store: string, path: string) {
  await page.goto(`/${store}/settings/${path}`);
  await page.waitForLoadState("networkidle");
}

export async function chooseOption(page: Page, field: string, option: RegExp) {
  await sheet(page).getByRole("combobox", { name: field }).click();
  await page.getByRole("option", { name: option }).first().click();
}

/** Picks from a searchable list: types, then chooses the matching option, which closes the list. */
export async function pick(
  page: Page,
  field: string,
  text: string,
  option: RegExp,
) {
  await sheet(page).getByRole("combobox", { name: field }).fill(text);
  await page.getByRole("option", { name: option }).first().click();
}

export const toast = (page: Page) =>
  page.locator("[data-sonner-toast], [role=status]");

/**
 * Captures the dashboard's window as the admin sees it, with what its toast
 * said. An empty live region is not a message.
 */
export async function capture(
  page: Page,
  screen: string,
  state: string,
  note: string,
) {
  const said = (await toast(page).allInnerTexts())
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  await save(
    page,
    {
      screen,
      state,
      variant: "admin",
      window: true,
      note,
      reach: async () => undefined,
    },
    1280,
    said.length ? `The screen said: "${said.join(" ")}".` : null,
  );
}
