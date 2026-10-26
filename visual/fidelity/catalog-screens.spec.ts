import { expect, type Locator, type Page } from "@playwright/test";
import { BASE_PATH, waitForHydration } from "../../e2e/support";
import { open } from "./capture";
import {
  addButton,
  barButton,
  category,
  chooseFilter,
  chooseOptions,
  chooseSort,
  detail,
  drawer,
  emptySubcategory,
  galleryProduct,
  heading,
  main,
  openBarMenu,
  openDrawer,
  openListing,
  openProduct,
  optionsProduct,
  plainCategory,
  productCount,
  productNames,
  scrollPastList,
  scrollToEnd,
  secondMarket,
  subcategory,
  translatedProduct,
} from "./catalog";
import { proxy } from "./proxy";
import {
  hiddenField,
  market,
  newPolicy,
  privacyContent,
  renamedProduct,
  shownField,
} from "./settings-values";
import { type Capture, interceptActions, runCaptures, visit } from "./shop-run";

/**
 * Captures the running storefront's product lists, category pages and product
 * pages in each meaningful state and variant the storefront shop batch's
 * second part maps (LIQ-010 §12.1, step 4). Like `shop-screens.spec.ts`, it
 * gathers evidence for a person to review and passes whenever it can capture
 * a screen; it compares nothing.
 *
 * Start the backend and the storefront as `compare.spec.ts` describes, with
 * Spree's sample catalog, the browser tests' two-option product
 * (`scripts/e2e/bootstrap-spree.sh`), a category with a picture, a description
 * and subcategories (`FIDELITY_CATEGORY`), one without a picture
 * (`FIDELITY_PLAIN_CATEGORY`), a subcategory with products
 * (`FIDELITY_SUBCATEGORY`) and one with none (`FIDELITY_EMPTY_SUBCATEGORY`), a
 * product with several pictures and custom fields (`FIDELITY_GALLERY_PRODUCT`)
 * and its address in the second market's language
 * (`FIDELITY_TRANSLATED_PRODUCT`), and a second market in another currency and
 * language. A customer is registered by the run.
 *
 * Each capture names the set-up it needs, and `FIDELITY_SHOP_SETUP` says which
 * one this run has. Besides `shop-screens.spec.ts`'s `standard`, `wholesale`
 * and `proxied`, where the proxy also fails the product list's filters when a
 * state asks:
 *
 * - `prices-hidden` and `sign-in-required`: the store's storefront access saved
 *   as "prices hidden" or "sign-in required" in the dashboard's store settings
 *   before the storefront starts.
 * - `market-added`: `settings.spec.ts`'s `market` step saved before the
 *   storefront starts, and `settings-saved`: its `market-language` and
 *   `policies-and-fields` steps.
 *
 * For each of these, start the storefront afresh, so nothing it fetched under
 * the earlier settings is cached.
 *
 * Where each capture is saved is described in `capture.ts`.
 */

async function listingObserved(page: Page) {
  const count = (await productCount(page).count())
    ? `says "${await productCount(page).first().textContent()}"`
    : "shows no count of them";
  return `The page lists ${await productNames(page).count()} products and ${count}. Its address is ${new URL(page.url()).pathname}${new URL(page.url()).search}.`;
}

async function productObserved(page: Page) {
  const read = async (locator: Locator) =>
    (await locator.count())
      ? ((await locator.first().textContent())?.trim() ?? "")
      : "none";
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .evaluateAll((elements) =>
      elements.map((element) =>
        [JSON.parse(element.textContent ?? "{}")]
          .flat()
          .map((data) => data["@type"])
          .join(", "),
      ),
    );
  return `Options: ${await read(detail(page, "Options"))}. SKU: ${await read(detail(page, "SKU"))}. Add to Cart: ${(await addButton(page).count()) ? ((await addButton(page).isEnabled()) ? "shown and enabled" : "shown and disabled") : "not shown"}. The page's source holds structured data for search engines of the types: ${blocks.join("; ") || "none"}. Its address is ${new URL(page.url()).pathname}${new URL(page.url()).search}.`;
}

const bothVariants = (capture: Omit<Capture, "variant">): Capture[] =>
  (["guest", "customer"] as const).map((variant) => ({ ...capture, variant }));

/** The home page, a list, a category and a product page under one setting. */
const accessCaptures = (
  access: "prices-hidden" | "sign-in-required",
): Capture[] =>
  [
    { screen: "SF-SHOP-01", state: access, route: "" },
    { screen: "SF-SHOP-02", state: access, route: "/products" },
    { screen: "SF-SHOP-03", state: access, route: `/c/${category}` },
    {
      screen: "SF-SHOP-04",
      state: access,
      route: `/products/${galleryProduct}`,
    },
  ].flatMap(({ route, ...capture }) =>
    bothVariants({
      ...capture,
      setup: access,
      note: `The store's storefront access was saved as "${access === "prices-hidden" ? "prices hidden" : "sign-in required"}" in the dashboard's store settings (DA-SET-02) before the storefront started.`,
      reach: async (page) => {
        const observed = await visit(page, `/us/en${route}`);
        const prices = await main(page).getByText(/\$\d/).count();
        const heading = page.getByRole("heading").first();
        const headingText = (await heading.count())
          ? `Its first heading reads "${(await heading.innerText()).trim()}"`
          : `It has no heading and reads "${(await page.locator("body").innerText()).replace(/\s+/g, " ").trim()}"`;
        return `${observed} ${headingText}. The page shows ${prices} price(s), ${await productNames(page).count()} product name(s) as level 3 headings and ${(await addButton(page).count()) ? "an Add to Cart button" : "no Add to Cart button"}.`;
      },
    }),
  );

const regionDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Region and language" });

/** Opens the region and language dialog from the header, which has its control from 1024 pixels wide. */
async function openRegionDialog(page: Page, region?: string) {
  await open(page, "");
  const control = page
    .locator("header")
    .getByRole("button", { name: "Region and language" });
  await waitForHydration(control);
  await control.click();
  await expect(regionDialog(page)).toBeVisible();
  if (region) {
    await regionDialog(page)
      .getByRole("combobox", { name: "Region" })
      .selectOption(region);
  }
  const choices = (name: string) =>
    regionDialog(page)
      .getByRole("combobox", { name })
      .locator("option")
      .allTextContents();
  return `The dialog offers the regions ${(await choices("Region")).join(", ")}; for the region shown, the languages ${(await choices("Language")).join(", ")}.`;
}

const regionNote =
  "Captured at 1280 pixels only: the header has the control from 1024 pixels wide, and part 1 captured the same dialog opened from the menu on a phone.";

/** Whether the page shows each text, for what a capture shows or leaves out. */
async function shows(page: Page, texts: string[]) {
  const answers = await Promise.all(
    texts.map(
      async (text) =>
        `"${text}" ${(await main(page).getByText(text).count()) ? "shown" : "not shown"}`,
    ),
  );
  return answers.join("; ");
}

const renamedNote = `"${renamedProduct.name}" was renamed "${renamedProduct.newName}" in the dashboard and its Slug changed from "${renamedProduct.slug}" to "${renamedProduct.newSlug}" (DA-PRD-03), and the storefront restarted.`;

const renamedCaptures: Capture[] = [
  {
    screen: "SF-SHOP-04",
    state: "renamed-new-address",
    variant: "guest",
    setup: "product-renamed",
    note: renamedNote,
    reach: (page) =>
      pageObserved(page, `${BASE_PATH}/products/${renamedProduct.newSlug}`),
  },
  {
    screen: "SF-SHOP-04",
    state: "renamed-old-address",
    variant: "guest",
    setup: "product-renamed",
    note: `${renamedNote} Spree's documentation says the Store API answers a retired slug with not found and leaves redirects to the storefront.`,
    reach: (page) =>
      pageObserved(page, `${BASE_PATH}/products/${renamedProduct.slug}`),
  },
];

const firstRunMarket = process.env.FIDELITY_FIRST_RUN_MARKET ?? "pl/en";
const firstRunBase = `/${firstRunMarket}`;
const firstRunState = `first-run-sample-data-${firstRunMarket.split("/")[0]}`;
const firstRunNote = `The storefront was built against a store made by first-run setup with "Load sample data" left chosen (G-36), served at ${firstRunBase}, after the sample data job had stopped.`;

/** What a page of the first-run store shows: its address, status, headings and products. */
/** What a page shows: its address, status, headings, products and prices. */
async function pageObserved(page: Page, address: string) {
  const response = await page.goto(address);
  await page.waitForLoadState("networkidle");
  const headings = (await page.getByRole("heading").allInnerTexts())
    .map((text) => `"${text.trim()}"`)
    .slice(0, 4);
  return `Opened ${address}; arrived at ${new URL(page.url()).pathname}, answered with status ${response?.status()}. Its headings start ${headings.join(", ") || "nowhere: it has none"}. It shows ${await productNames(page).count()} product name(s) as level 3 headings and ${await main(
    page,
  )
    .getByText(/\d[\d.,]*\s?(zł|PLN)|(\$|€)\d/)
    .count()} price(s).`;
}

const firstRunObserved = (page: Page, route: string) =>
  pageObserved(page, `${firstRunBase}${route}`);

const firstRunCaptures: Capture[] = [
  ...[
    { screen: "SF-SHOP-01", route: "" },
    { screen: "SF-SHOP-02", route: "/products" },
    { screen: "SF-SHOP-04", route: `/products/${galleryProduct}` },
  ].map(
    ({ screen, route }): Capture => ({
      screen,
      state: firstRunState,
      variant: "guest",
      setup: "first-run",
      note: firstRunNote,
      reach: (page) => firstRunObserved(page, route),
    }),
  ),
  {
    screen: "SF-OVL-01",
    state: `menu-${firstRunState}`,
    variant: "guest",
    setup: "first-run",
    only: 390,
    window: true,
    note: `${firstRunNote} Captured at 390 pixels only, where the menu opens from the header's button.`,
    reach: async (page) => {
      await page.goto(firstRunBase);
      await page.waitForLoadState("networkidle");
      const button = page.getByRole("button", { name: "Open menu" });
      await waitForHydration(button);
      await button.click();
      const menu = page.getByRole("dialog", { name: "Menu" });
      await expect(menu.getByRole("link", { name: "Home" })).toBeVisible();
      return `The menu's links: ${(await menu.getByRole("link").allInnerTexts()).map((text) => text.trim()).join(", ")}.`;
    },
  },
];

const settingsCaptures: Capture[] = [
  {
    screen: "SF-OVL-04",
    state: "new-market-offered",
    variant: "guest",
    setup: "market-added",
    only: 1280,
    window: true,
    note: `${regionNote} The market was created in the dashboard (DA-SET-11) with English as its only language. Captured after the storefront was rebuilt twice: the first rebuild, a few minutes after the market was saved, still built this page from the market list its data cache kept on disk, and the dialog did not offer the new market.`,
    reach: (page) => openRegionDialog(page, market.code),
  },
  {
    screen: "SF-OVL-04",
    state: "new-market-before-rebuild",
    variant: "guest",
    setup: "market-added",
    only: 1280,
    window: true,
    note: `${regionNote} Opened from the United States home page after the storefront restarted with the new market saved, before it was rebuilt: the build keeps this page's list of regions, while the new market's own pages open (SF-SHOP-02 and SF-SHOP-04, new-market).`,
    reach: (page) => openRegionDialog(page),
  },
  ...bothVariants({
    screen: "SF-SHOP-02",
    state: "new-market",
    setup: "market-added",
    note: "The market created in the dashboard (DA-SET-11), in euros.",
    reach: async (page) => {
      await openListing(page, "/products", `/${market.code}/en`);
      return listingObserved(page);
    },
  }),
  {
    screen: "SF-SHOP-04",
    state: "new-market",
    variant: "guest",
    setup: "market-added",
    note: "The market created in the dashboard (DA-SET-11), in euros.",
    reach: async (page) => {
      await openProduct(page, galleryProduct, `/${market.code}/en`);
      return productObserved(page);
    },
  },
  {
    screen: "SF-OVL-04",
    state: "language-added",
    variant: "guest",
    setup: "settings-saved",
    only: 1280,
    window: true,
    note: `${regionNote} Spanish was added to the market's languages in the dashboard (DA-SET-11). Captured after the storefront's market response, kept on disk by its data cache for up to 15 minutes, was deleted and the storefront rebuilt: two rebuilds within those 15 minutes still offered the market's earlier languages only.`,
    reach: (page) => openRegionDialog(page, market.code),
  },
  {
    screen: "SF-SHOP-02",
    state: "language-added",
    variant: "guest",
    setup: "settings-saved",
    note: "The market's list in Spanish, the language added in the dashboard (DA-SET-11).",
    reach: async (page) => {
      await openListing(page, "/products", `/${market.code}/${market.code}`);
      return listingObserved(page);
    },
  },
  {
    screen: "SF-SHOP-06",
    state: "content-saved",
    variant: "guest",
    setup: "settings-saved",
    note: "The privacy policy's content, written in the dashboard (DA-SET-06).",
    reach: async (page) => {
      const observed = await visit(page, "/us/en/policies/privacy-policy");
      return `${observed} ${await shows(page, [privacyContent])}.`;
    },
  },
  {
    screen: "SF-SHOP-06",
    state: "new-policy",
    variant: "guest",
    setup: "settings-saved",
    note: "A policy created in the dashboard (DA-SET-06), opened at its address.",
    reach: async (page) => {
      const observed = await visit(page, `/us/en/policies/${newPolicy.slug}`);
      const footerLinks = await page
        .locator("footer")
        .getByRole("link", { name: /polic|terms/i })
        .allTextContents();
      return `${observed} ${await shows(page, [newPolicy.name, newPolicy.content])}. The footer's policy links: ${footerLinks.join(", ")}.`;
    },
  },
  ...bothVariants({
    screen: "SF-SHOP-04",
    state: "custom-fields-saved",
    setup: "settings-saved",
    note: `Two product custom fields defined in the dashboard (DA-SET-09), "${shownField.label}" visible on the storefront and "${hiddenField.label}" not, and given values on this product's page there (DA-PRD-03).`,
    reach: async (page) => {
      await openProduct(page, optionsProduct);
      return `${await productObserved(page)} ${await shows(page, [shownField.label, shownField.value, hiddenField.label, hiddenField.value])}.`;
    },
  }),
];

const captures: Capture[] = [
  // SF-SHOP-02 Products and search
  ...bothVariants({
    screen: "SF-SHOP-02",
    state: "all-products",
    reach: async (page) => {
      await openListing(page, "/products");
      return listingObserved(page);
    },
  }),
  ...(["Color", "Price", "Availability"] as const).map(
    (name): Capture => ({
      screen: "SF-SHOP-02",
      state: `${name.toLowerCase()}-dropdown-open`,
      variant: "guest",
      only: 1280,
      window: true,
      note: "The filter bar's dropdowns show from 768 pixels wide; on a phone the filters drawer holds the same choices.",
      reach: async (page) => {
        await openListing(page, "/products");
        const menu = await openBarMenu(page, name);
        const items = await menu
          .getByRole("menuitemcheckbox")
          .or(menu.getByRole("menuitemradio"))
          .allTextContents();
        return `The dropdown offers ${items.length} choices: ${items.map((item) => item.replace(/\s+/g, " ").trim()).join("; ")}.`;
      },
    }),
  ),
  {
    screen: "SF-SHOP-02",
    state: "sort-dropdown-open",
    variant: "guest",
    window: true,
    reach: async (page) => {
      await openListing(page, "/products");
      const menu = await openBarMenu(page, "Sort");
      const items = await menu.getByRole("menuitemradio").allTextContents();
      return `The sort dropdown offers: ${items.join("; ")}.`;
    },
  },
  {
    screen: "SF-SHOP-02",
    state: "filters-applied",
    variant: "guest",
    note: "Chosen as a shopper does: from the filter bar's dropdowns on a wider screen, and from the filters drawer on a phone.",
    reach: async (page) => {
      await openListing(page, "/products");
      await chooseFilter(page, "Color", /^White\s*\(/);
      await chooseFilter(page, "Price", /^\$100 – \$200/);
      await expect(
        main(page).getByRole("button", { name: "Clear all" }),
      ).toBeVisible();
      return listingObserved(page);
    },
  },
  {
    screen: "SF-SHOP-02",
    state: "filters-drawer-empty",
    variant: "guest",
    only: 390,
    window: true,
    note: "The filters drawer opens from the filter bar below 768 pixels wide; a wider screen shows the dropdowns instead.",
    reach: async (page) => {
      await openListing(page, "/products");
      await openDrawer(page);
    },
  },
  {
    screen: "SF-SHOP-02",
    state: "filters-drawer-with-choices",
    variant: "guest",
    only: 390,
    window: true,
    note: "The choices are staged in the drawer and not yet applied.",
    reach: async (page) => {
      await openListing(page, "/products");
      await openDrawer(page);
      await drawer(page)
        .getByRole("button", { name: /^White\s*\(/ })
        .click();
      await drawer(page)
        .getByRole("button", { name: /^In Stock/ })
        .click();
      const clear = drawer(page).getByRole("button", { name: /^Clear all/ });
      return `The drawer's clear button reads "${await clear.textContent()}".`;
    },
  },
  {
    screen: "SF-SHOP-02",
    state: "no-products-for-filters",
    variant: "guest",
    note: 'Size S, which only the browser tests\' two-option product has, and has in stock, chosen together with "Out of Stock", as a shopper does at each width. Once a filter is chosen the others offer only what the narrowed list holds, so a price range cannot empty it.',
    reach: async (page) => {
      await openListing(page, "/products");
      await chooseFilter(page, "Size", /^S\b/);
      await chooseFilter(page, "Availability", /^Out of Stock/);
      await expect(main(page).getByText("No products found")).toBeVisible();
      return listingObserved(page);
    },
  },
  ...bothVariants({
    screen: "SF-SHOP-02",
    state: "search-results",
    note: "The address the header's search opens for the word.",
    reach: async (page) => {
      await openListing(page, "/products?q=espresso");
      return listingObserved(page);
    },
  }),
  {
    screen: "SF-SHOP-02",
    state: "no-match-for-word",
    variant: "guest",
    reach: async (page) => {
      await open(page, "/products?q=zebrawood");
      await expect(main(page).getByText("No products found")).toBeVisible();
      return listingObserved(page);
    },
  },
  {
    screen: "SF-SHOP-02",
    state: "end-of-list",
    variant: "guest",
    reach: async (page) => {
      await openListing(page, "/products");
      await scrollToEnd(page);
      return listingObserved(page);
    },
  },
  {
    screen: "SF-SHOP-02",
    state: "loading",
    variant: "guest",
    setup: "proxied",
    oneVisit: true,
    note: "The proxy in front of the backend held the product list for 20 seconds, so the page showed what the storefront streams while it waits. Nothing was cached for this address. One visit shows this once, so the page was captured at 390 pixels and then widened to 1280 without reloading.",
    reach: async (page) => {
      proxy.productList = "delay";
      await page.goto("/us/en/products?sort=-name", { waitUntil: "commit" });
      await expect(heading(page)).toBeVisible();
      await expect(main(page).locator(".animate-pulse").first()).toBeVisible();
    },
  },
  {
    screen: "SF-SHOP-02",
    state: "loading-more",
    variant: "guest",
    setup: "proxied",
    oneVisit: true,
    note: "After the first page arrived, the proxy held the next page for 20 seconds. One visit shows this once, so the page was captured at 390 pixels and then widened to 1280 without reloading.",
    reach: async (page) => {
      await openListing(page, "/products?sort=name");
      proxy.productList = "delay";
      await scrollPastList(page);
      await expect(main(page).getByText("Loading more...")).toBeVisible();
    },
  },
  {
    screen: "SF-SHOP-02",
    state: "loading-more-failed",
    variant: "guest",
    setup: "proxied",
    note: "After the first page arrived, the proxy answered the next page with a server error.",
    reach: async (page) => {
      await openListing(page, "/products?sort=price");
      proxy.productList = "fail";
      await scrollPastList(page);
      await page.waitForTimeout(3_000);
      await scrollPastList(page);
      await page.waitForTimeout(1_000);
      const loading = await main(page).getByText("Loading more...").count();
      const end = await main(page)
        .getByText("No more products to load")
        .count();
      return `${await listingObserved(page)} After the failure the page shows ${loading ? "" : "no "}loading message and ${end ? "" : "no "}end-of-list message, and nothing that offers to try again.`;
    },
  },
  {
    screen: "SF-SHOP-02",
    state: "filters-failed",
    variant: "guest",
    setup: "proxied",
    note: "The proxy answered the list's filters with a server error; the products themselves arrived.",
    reach: async (page) => {
      proxy.productFilters = "fail";
      await openListing(page, "/products?availability=in_stock");
      const sort = await barButton(page, "Sort").count();
      return `${await listingObserved(page)} ${
        sort
          ? "The filter bar is shown."
          : "The whole filter bar is missing, sorting with it, so nothing shows the address's availability filter or offers to clear it."
      }`;
    },
  },
  {
    screen: "SF-SHOP-02",
    state: "all-products-wholesale-on",
    variant: "guest",
    setup: "wholesale",
    note: "The storefront was built with the wholesale channel set (SPREE_WHOLESALE_CHANNEL), which adds the wholesale links around the page.",
    reach: async (page) => {
      await openListing(page, "/products");
      return listingObserved(page);
    },
  },

  // SF-SHOP-03 Category
  ...bothVariants({
    screen: "SF-SHOP-03",
    state: "category-with-picture",
    note: "The category's picture and description were added to this lane's test database through the Admin API, from the sample catalog's own product pictures; the sample catalog's categories have neither.",
    reach: async (page) => {
      await openListing(page, `/c/${category}`);
      return listingObserved(page);
    },
  }),
  {
    screen: "SF-SHOP-03",
    state: "category-without-picture",
    variant: "guest",
    reach: async (page) => {
      await openListing(page, `/c/${plainCategory}`);
      return listingObserved(page);
    },
  },
  {
    screen: "SF-SHOP-03",
    state: "subcategory",
    variant: "guest",
    reach: async (page) => {
      await openListing(page, `/c/${subcategory}`);
      const trail = await page
        .getByRole("navigation", { name: "Breadcrumb" })
        .first()
        .innerText();
      return `${await listingObserved(page)} The breadcrumb reads "${trail.replace(/\s+/g, " ")}".`;
    },
  },
  {
    screen: "SF-SHOP-03",
    state: "subcategory-without-products",
    variant: "guest",
    note: "A subcategory added to this lane's test database through the Admin API, with no products in it.",
    reach: async (page) => {
      await open(page, `/c/${emptySubcategory}`);
      await expect(main(page).getByText("No products found")).toBeVisible();
      return listingObserved(page);
    },
  },
  {
    screen: "SF-SHOP-03",
    state: "filtered-and-sorted",
    variant: "guest",
    note: "Sorted from the sort dropdown and filtered as a shopper does at each width, as on the products page.",
    reach: async (page) => {
      await openListing(page, `/c/${plainCategory}`);
      await chooseSort(page, "Price (low-high)");
      await chooseFilter(page, "Color", /^White\s*\(/);
      // The list is drawn afresh for the new address once it is settled.
      await expect(productNames(page).first()).toBeVisible();
      return listingObserved(page);
    },
  },
  {
    screen: "SF-SHOP-03",
    state: "not-found",
    variant: "guest",
    reach: (page) => visit(page, "/us/en/c/no-such-category"),
  },

  // SF-SHOP-04 Product
  ...bothVariants({
    screen: "SF-SHOP-04",
    state: "several-pictures",
    reach: async (page) => {
      await openProduct(page, galleryProduct);
      const thumbnails = await main(page)
        .locator(".overflow-x-auto > button")
        .count();
      return `${await productObserved(page)} The gallery shows ${thumbnails} thumbnail button(s).`;
    },
  }),
  {
    screen: "SF-SHOP-04",
    state: "picture-enlarged",
    variant: "guest",
    window: true,
    note: "Opened with the gallery's zoom button, then moved to the next picture.",
    reach: async (page) => {
      await openProduct(page, galleryProduct);
      const zoom = main(page)
        .getByRole("button", { name: "Open image zoom" })
        .first();
      await waitForHydration(zoom);
      await zoom.click();
      const next = page.getByRole("button", { name: "Next image" });
      await expect(next).toBeVisible({ timeout: 15_000 });
      await next.click();
      await page.waitForTimeout(500);
    },
  },
  {
    screen: "SF-SHOP-04",
    state: "colour-and-size-chosen",
    variant: "guest",
    note: "The browser tests' two-option product, which has no pictures.",
    reach: async (page) => {
      await chooseOptions(page, "Red", "S");
      return productObserved(page);
    },
  },
  {
    screen: "SF-SHOP-04",
    state: "sale-price",
    variant: "guest",
    reach: async (page) => {
      await chooseOptions(page, "Red", "M");
      return productObserved(page);
    },
  },
  {
    screen: "SF-SHOP-04",
    state: "sold-out-choice",
    variant: "guest",
    reach: async (page) => {
      await chooseOptions(page, "Black", "L");
      return productObserved(page);
    },
  },
  {
    screen: "SF-SHOP-04",
    state: "quantity-chosen",
    variant: "guest",
    reach: async (page) => {
      await chooseOptions(page, "Black", "S");
      const increase = main(page).getByRole("button", {
        name: "Increase quantity",
      });
      await increase.click();
      await increase.click();
      await expect(
        main(page).getByRole("textbox", { name: "Quantity" }),
      ).toHaveValue("3");
      return productObserved(page);
    },
  },
  {
    screen: "SF-SHOP-04",
    state: "adding-to-the-cart",
    variant: "guest",
    note: "The browser left the add-to-cart request unanswered, to show it in progress; this says nothing about the server.",
    reach: async (page) => {
      await chooseOptions(page, "Black", "S");
      await interceptActions(page, "hold");
      await addButton(page).click();
      await expect(
        main(page).getByRole("button", { name: /adding/i }),
      ).toBeVisible();
      return productObserved(page);
    },
  },
  {
    screen: "SF-SHOP-04",
    state: "added-to-the-cart",
    variant: "guest",
    window: true,
    note: "The cart drawer's own states belong to the cart batch; this records only that it opens.",
    reach: async (page) => {
      await chooseOptions(page, "Black", "S");
      await addButton(page).click();
      const cart = page.getByRole("dialog", { name: /^cart/i });
      await expect(
        cart.getByRole("link", { name: "E2E Two-Option Tee" }),
      ).toBeVisible({ timeout: 30_000 });
      return `The cart drawer opened and lists the product.`;
    },
  },
  ...bothVariants({
    screen: "SF-SHOP-04",
    state: "second-market",
    note: "The second market's address for the product, in its language.",
    reach: async (page) => {
      await openProduct(page, translatedProduct, secondMarket);
      const price = await main(page).getByText(/€/).first().textContent();
      return `The heading reads "${await heading(page).textContent()}" and the first price "${price}". The page's language is "${await page.locator("html").getAttribute("lang")}".`;
    },
  }),
  {
    screen: "SF-SHOP-04",
    state: "second-market-default-address",
    variant: "guest",
    note: "The product's address in the default language, opened in the second market's language.",
    reach: async (page) => {
      const observed = await visit(
        page,
        `${secondMarket}/products/${galleryProduct}`,
      );
      return `${observed} The heading reads "${await heading(page).first().textContent()}".`;
    },
  },
  {
    screen: "SF-SHOP-04",
    state: "not-found",
    variant: "guest",
    reach: (page) => visit(page, "/us/en/products/no-such-product"),
  },
  {
    screen: "SF-SHOP-04",
    state: "several-pictures-wholesale-on",
    variant: "guest",
    setup: "wholesale",
    note: "The storefront was built with the wholesale channel set (SPREE_WHOLESALE_CHANNEL), which adds the wholesale links around the page.",
    reach: async (page) => {
      await openProduct(page, galleryProduct);
      return productObserved(page);
    },
  },

  ...accessCaptures("prices-hidden"),
  ...accessCaptures("sign-in-required"),
  ...settingsCaptures,
  ...firstRunCaptures,
  ...renamedCaptures,
];

runCaptures(captures);
