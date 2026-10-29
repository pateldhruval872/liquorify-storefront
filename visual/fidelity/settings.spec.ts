import { expect, type Page, test } from "@playwright/test";
import { save } from "./capture";
import {
  hiddenField,
  market,
  newPolicy,
  privacyContent,
  renamedProduct,
  shownField,
} from "./settings-values";

/**
 * Saves the settings the storefront shop batch checks on the storefront
 * (G-38's storefront part) through the dashboard's own screens, as a merchant
 * does, and captures each screen once it has saved. `catalog-screens.spec.ts`
 * and `shop-screens.spec.ts` then capture the storefront under the setting.
 *
 * Serve the built dashboard at `FIDELITY_DASHBOARD` (default
 * `http://localhost:5174`) against the storefront's backend, and give an admin's
 * sign-in in `FIDELITY_ADMIN_EMAIL` and `FIDELITY_ADMIN_PASSWORD`; neither has
 * a default. `FIDELITY_SETTINGS_STEP` names what this run saves:
 *
 * - `prices-hidden`, `sign-in-required` and `public`: the store's storefront
 *   access (DA-SET-02).
 * - `market`: a market for Spain in euros, in English only (DA-SET-11).
 * - `market-language`: Spanish added to that market (DA-SET-11).
 * - `policies-and-fields`: the privacy policy's content and a new policy
 *   (DA-SET-06); a product custom field shown on the storefront and one that is
 *   not (DA-SET-09), both given a value on the browser tests' two-option
 *   product, which has no product type, so its page offers every product field.
 *
 * - `rename-product`: a sample product renamed, its address read, and then
 *   given a new address in its SEO section (DA-PRD-03, CAP-05-16).
 * - `rename-product-back`: its name and address put back.
 *
 * Restart the storefront after each step: it keeps markets for hours and lists
 * for ten minutes, and nothing tells it the setting changed.
 */

const dashboard = process.env.FIDELITY_DASHBOARD ?? "http://localhost:5174";
const step = process.env.FIDELITY_SETTINGS_STEP;
const optionsProduct =
  process.env.FIDELITY_OPTIONS_PRODUCT ?? "prod_oqlrKdXjaP";

const sheet = (page: Page) => page.getByRole("dialog");

async function signIn(page: Page) {
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

async function openSettings(page: Page, store: string, path: string) {
  await page.goto(`/${store}/settings/${path}`);
  await page.waitForLoadState("networkidle");
}

async function chooseOption(page: Page, field: string, option: RegExp) {
  await sheet(page).getByRole("combobox", { name: field }).click();
  await page.getByRole("option", { name: option }).first().click();
}

/** Picks from a searchable list: types, then chooses the matching option, which closes the list. */
async function pick(page: Page, field: string, text: string, option: RegExp) {
  await sheet(page).getByRole("combobox", { name: field }).fill(text);
  await page.getByRole("option", { name: option }).first().click();
}

const toast = (page: Page) =>
  page.locator("[data-sonner-toast], [role=status]");

async function capture(
  page: Page,
  screen: string,
  state: string,
  note: string,
) {
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
    (await toast(page).count())
      ? `The screen said: "${(await toast(page).first().innerText()).replace(/\s+/g, " ")}".`
      : null,
  );
}

async function saveStorefrontAccess(page: Page, store: string, label: RegExp) {
  await openSettings(page, store, "store");
  await page.getByRole("combobox", { name: "Storefront access" }).click();
  await page.getByRole("option", { name: label }).click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Store settings updated").first()).toBeVisible();
  await page
    .getByRole("combobox", { name: "Storefront access" })
    .evaluate((element) => element.scrollIntoView({ block: "center" }));
}

const slugField = (page: Page) => page.getByRole("textbox", { name: "Slug" });

async function openProduct(page: Page, store: string, id: string) {
  await page.goto(`/${store}/products/${id}`);
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("textbox", { name: "Name", exact: true }),
  ).not.toHaveValue("");
}

async function saveProduct(page: Page) {
  await page.getByRole("button", { name: "Save product" }).click();
  await expect(page.getByText(/saved|updated/i).first()).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    page.getByRole("button", { name: "Save product" }),
  ).toBeDisabled();
}

const steps: Record<string, (page: Page, store: string) => Promise<void>> = {
  "prices-hidden": async (page, store) => {
    await saveStorefrontAccess(page, store, /^Prices hidden/);
    await capture(
      page,
      "DA-SET-02",
      "saved-prices-hidden",
      "Saved through the store settings screen.",
    );
  },
  "sign-in-required": async (page, store) => {
    await saveStorefrontAccess(page, store, /^Login required/);
    await capture(
      page,
      "DA-SET-02",
      "saved-sign-in-required",
      "Saved through the store settings screen.",
    );
  },
  public: async (page, store) => {
    await saveStorefrontAccess(page, store, /^Public/);
    await capture(
      page,
      "DA-SET-02",
      "saved-public",
      "Put back to public through the store settings screen.",
    );
  },
  market: async (page, store) => {
    await openSettings(page, store, "markets");
    await page.getByRole("button", { name: "Add market" }).click();
    await sheet(page).getByRole("textbox", { name: "Name" }).fill(market.name);
    await chooseOption(page, "Currency", /^EUR — Euro$/);
    await chooseOption(page, "Default locale", /^EN — English$/);
    await pick(page, "Search countries…", market.country, /^Spain/);
    await sheet(page).getByRole("button", { name: "Create market" }).click();
    await expect(sheet(page)).toBeHidden({ timeout: 15_000 });
    await expect(
      page.getByRole("row").filter({ hasText: market.name }),
    ).toBeVisible();
    await capture(
      page,
      "DA-SET-11",
      "saved-new-market",
      "Created through the markets screen: Spain, in euros, with English as its only language.",
    );
  },
  "market-language": async (page, store) => {
    await openSettings(page, store, "markets");
    await page
      .getByRole("button", { name: new RegExp(`^${market.name}`) })
      .first()
      .click();
    await expect(sheet(page)).toBeVisible();
    await pick(page, "Supported locales", "es", /^ES — Spanish$/);
    await sheet(page).getByRole("button", { name: /^Save/ }).click();
    await expect(sheet(page)).toBeHidden({ timeout: 15_000 });
    await capture(
      page,
      "DA-SET-11",
      "saved-language-added",
      "Spanish added to the Spain market's languages through the markets screen.",
    );
  },
  "policies-and-fields": async (page, store) => {
    await openSettings(page, store, "policies");
    await page
      .getByRole("button", { name: /^Privacy Policy/ })
      .first()
      .click();
    const content = sheet(page).getByRole("textbox", { name: "Content" });
    await content.click();
    await content.fill(privacyContent);
    await sheet(page).getByRole("button", { name: /^Save/ }).click();
    await expect(sheet(page)).toBeHidden({ timeout: 15_000 });

    await page.getByRole("button", { name: "Add policy" }).click();
    await sheet(page)
      .getByRole("textbox", { name: "Name" })
      .fill(newPolicy.name);
    await sheet(page)
      .getByRole("textbox", { name: "Content" })
      .fill(newPolicy.content);
    await sheet(page).getByRole("button", { name: "Create policy" }).click();
    await expect(sheet(page)).toBeHidden({ timeout: 15_000 });
    await expect(
      page.getByRole("row").filter({ hasText: newPolicy.name }),
    ).toBeVisible();
    await capture(
      page,
      "DA-SET-06",
      "saved-content-and-new-policy",
      "The privacy policy's content and a new policy, saved through the policies screen.",
    );

    await openSettings(page, store, "custom-field-definitions");
    for (const [field, visible] of [
      [shownField, true],
      [hiddenField, false],
    ] as const) {
      await page.getByRole("button", { name: "Add custom field" }).click();
      await sheet(page)
        .getByRole("textbox", { name: "Label" })
        .fill(field.label);
      await sheet(page).getByRole("textbox", { name: "Key" }).fill(field.key);
      await chooseOption(page, "Applies to", /^Products?$/);
      const switchControl = sheet(page).getByRole("switch", {
        name: "Visible on storefront",
      });
      if ((await switchControl.isChecked()) !== visible)
        await switchControl.click();
      await sheet(page)
        .getByRole("button", { name: /^Create/ })
        .click();
      await expect(sheet(page)).toBeHidden({ timeout: 15_000 });
    }
    await capture(
      page,
      "DA-SET-09",
      "saved-shown-and-hidden-fields",
      `"${shownField.label}" saved as visible on the storefront and "${hiddenField.label}" as not, through the custom fields screen.`,
    );

    await page.goto(`/${store}/products/${optionsProduct}`);
    await page.waitForLoadState("networkidle");
    for (const field of [shownField, hiddenField]) {
      await page.getByRole("textbox", { name: field.label }).fill(field.value);
    }
    await page.getByRole("button", { name: "Save product" }).click();
    await expect(page.getByText(/saved|updated/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await page
      .getByRole("textbox", { name: shownField.label })
      .evaluate((element) => element.scrollIntoView({ block: "center" }));
    await capture(
      page,
      "DA-PRD-03",
      "custom-field-values-saved",
      "Both fields given a value on the browser tests' two-option product and saved from its page.",
    );
  },
  "rename-product": async (page, store) => {
    await openProduct(page, store, renamedProduct.id);
    await page
      .getByRole("textbox", { name: "Name", exact: true })
      .fill(renamedProduct.newName);
    await saveProduct(page);
    const afterRename = await slugField(page).inputValue();
    await slugField(page).fill(renamedProduct.newSlug);
    await saveProduct(page);
    await slugField(page).evaluate((element) =>
      element.scrollIntoView({ block: "center" }),
    );
    await capture(
      page,
      "DA-PRD-03",
      "renamed-with-new-address",
      `"${renamedProduct.name}" renamed "${renamedProduct.newName}" and saved: its Slug field then read "${afterRename}". The Slug was then changed to "${renamedProduct.newSlug}" and saved.`,
    );
  },
  "rename-product-back": async (page, store) => {
    await openProduct(page, store, renamedProduct.id);
    await page
      .getByRole("textbox", { name: "Name", exact: true })
      .fill(renamedProduct.name);
    await slugField(page).fill(renamedProduct.slug);
    await saveProduct(page);
  },
};

test.use({ baseURL: dashboard, viewport: { width: 1280, height: 960 } });

test(`save ${step}`, async ({ page }) => {
  const run = step ? steps[step] : undefined;
  if (!run)
    throw new Error(
      `Set FIDELITY_SETTINGS_STEP to one of: ${Object.keys(steps).join(", ")}`,
    );
  await run(page, await signIn(page));
});
