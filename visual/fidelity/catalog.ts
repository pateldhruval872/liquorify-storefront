import { expect, type Page } from "@playwright/test";
import { BASE_PATH, waitForHydration } from "../../e2e/support";

/**
 * The storefront's product lists, category pages and product pages as a
 * shopper reaches them, shared by the captures (`catalog-screens.spec.ts`) and
 * the comparison with the stories (`compare.spec.ts`). The catalog they expect
 * is described in `catalog-screens.spec.ts`.
 */

export const category =
  process.env.FIDELITY_CATEGORY ?? "kitchen/coffee-machines";
export const plainCategory = process.env.FIDELITY_PLAIN_CATEGORY ?? "kitchen";
export const subcategory =
  process.env.FIDELITY_SUBCATEGORY ?? "kitchen/kettles";
export const emptySubcategory =
  process.env.FIDELITY_EMPTY_SUBCATEGORY ??
  "kitchen/coffee-machines/espresso-machines";
export const galleryProduct =
  process.env.FIDELITY_GALLERY_PRODUCT ?? "automatic-espresso-machine";
export const translatedProduct =
  process.env.FIDELITY_TRANSLATED_PRODUCT ?? "kaffeevollautomat";
export const optionsProduct = "e2e-two-option-tee";
export const secondMarket = process.env.FIDELITY_SECOND_MARKET ?? "/de/de";

export const main = (page: Page) => page.getByRole("main");
/** The listed products' names, which link to their pages; "No products found" is a level 3 heading too. */
export const productNames = (page: Page) =>
  main(page)
    .getByRole("heading", { level: 3 })
    .filter({ has: page.getByRole("link") });
export const productCount = (page: Page) =>
  main(page)
    .getByText(/^\d+ (products?|productos?)$/)
    .filter({ visible: true });
export const isDesktop = (page: Page) =>
  (page.viewportSize()?.width ?? 0) >= 768;

/** A control of the filter bar, the one the page's width shows. */
export const barButton = (page: Page, name: string) =>
  main(page).getByRole("button", { name, exact: true }).filter({
    visible: true,
  });
export const drawer = (page: Page) =>
  page.getByRole("dialog", { name: "Filters" });

/** Opens a route in the default market, or in the market and language `base` names, such as `/de/de`. */
export async function openAt(page: Page, route: string, base = BASE_PATH) {
  await page.goto(`${base}${route}`);
  await page.waitForLoadState("networkidle");
}

export async function openListing(page: Page, route: string, base?: string) {
  await openAt(page, route, base);
  await expect(productNames(page).first()).toBeVisible({ timeout: 30_000 });
}

export async function openBarMenu(page: Page, name: string) {
  const button = barButton(page, name);
  await waitForHydration(button);
  await button.click();
  await expect(page.getByRole("menu")).toBeVisible();
  return page.getByRole("menu");
}

export async function openDrawer(page: Page) {
  // Its name gains the number of filters chosen, such as "Filters1".
  const button = main(page)
    .getByRole("button", { name: /^Filters\s*\d*$/ })
    .filter({ visible: true });
  await waitForHydration(button);
  await button.click();
  await expect(drawer(page)).toBeVisible();
}

/**
 * Waits for a choice to reach the address and for the list to finish
 * updating: the filter bar is marked busy until the new list arrives.
 */
export async function settled(page: Page, before: string) {
  await expect(page).not.toHaveURL(before, { timeout: 30_000 });
  await expect(main(page).locator('[aria-busy="true"]')).toHaveCount(0, {
    timeout: 30_000,
  });
  await page.waitForLoadState("networkidle");
}

/**
 * Chooses a filter as a shopper does at this width: from the filter bar's
 * dropdown on a wider screen, and from the filters drawer on a phone. Waits
 * for the list to show the choice.
 */
export async function chooseFilter(page: Page, group: string, choice: RegExp) {
  const before = page.url();
  if (isDesktop(page)) {
    const menu = await openBarMenu(page, group);
    await menu
      .getByRole("menuitemcheckbox")
      .or(menu.getByRole("menuitemradio"))
      .filter({ hasText: choice })
      .first()
      .click();
    await page.keyboard.press("Escape");
  } else {
    await openDrawer(page);
    await drawer(page).getByRole("button", { name: choice }).click();
    await drawer(page).getByRole("button", { name: "Show results" }).click();
  }
  await settled(page, before);
}

export async function chooseSort(page: Page, name: string) {
  const before = page.url();
  const menu = await openBarMenu(page, "Sort");
  await menu.getByRole("menuitemradio", { name }).click();
  await settled(page, before);
}

/**
 * Scrolls to just past the last product listed, where the list asks for more,
 * as a shopper scrolling down reaches it. Jumping to the foot of the page would
 * skip past that point on a phone, whose footer is taller than the window.
 */
export async function scrollPastList(page: Page) {
  await productNames(page).last().scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 400);
}

export async function scrollToEnd(page: Page) {
  const end = main(page).getByText("No more products to load");
  for (let attempt = 0; attempt < 12; attempt++) {
    if (await end.isVisible()) break;
    await scrollPastList(page);
    await page.waitForTimeout(1_500);
  }
  await expect(end).toBeVisible();
}

export const heading = (page: Page) => page.getByRole("heading", { level: 1 });

export async function openProduct(page: Page, slug: string, base?: string) {
  await openAt(page, `/products/${slug}`, base);
  await expect(heading(page)).toBeVisible({ timeout: 30_000 });
}

/** A product page's detail, such as its SKU or its chosen options. */
export const detail = (page: Page, term: string) =>
  main(page)
    .getByRole("term")
    .filter({ hasText: new RegExp(`^${term}$`) })
    .locator("xpath=following-sibling::*[1]");

/** A size button; a sold-out size carries "(Out of stock)" in its name. */
export const size = (page: Page, label: string) =>
  main(page).getByRole("button", { name: new RegExp(`^${label}\\b`) });

export async function chooseOptions(
  page: Page,
  colour: string,
  sizeLabel: string,
) {
  await openProduct(page, optionsProduct);
  await waitForHydration(size(page, "M"));
  await main(page).getByTitle(colour, { exact: true }).click();
  await expect(detail(page, "Options")).toHaveText(
    new RegExp(`^Color: ${colour}`),
    { timeout: 30_000 },
  );
  await size(page, sizeLabel).click();
  await expect(detail(page, "Options")).toHaveText(
    `Color: ${colour}, Size: ${sizeLabel}`,
    { timeout: 30_000 },
  );
  await page.waitForLoadState("networkidle");
}

export const addButton = (page: Page) =>
  main(page).getByRole("button", { name: /add to cart|adding/i });
