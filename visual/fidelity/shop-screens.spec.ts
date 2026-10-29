import { expect, type Page } from "@playwright/test";
import { addToCart, waitForHydration } from "../../e2e/support";
import { open } from "./capture";
import { proxy } from "./proxy";
import { type Capture, interceptActions, runCaptures, visit } from "./shop-run";

/**
 * Captures the running storefront's shop screens in each meaningful state and
 * variant the storefront shop batch maps (LIQ-010 §12.1, step 4): the home
 * page, the header, footer and menus, search, the region and language
 * preferences, the policy page, and the error and not-found pages. Like
 * `screens.spec.ts`, it gathers evidence for a person to review and passes
 * whenever it can capture a screen; it compares nothing.
 *
 * Start the backend and the storefront as `compare.spec.ts` describes, with a
 * catalog of several categories, one with a subcategory that has its own, a
 * second market with another currency and language, and a policy with no
 * content. `FIDELITY_PRODUCT` names a product with one variant to add to the
 * cart. A customer is registered by the run.
 *
 * Some states need the storefront set up another way, so each capture names
 * the set-up it needs, and `FIDELITY_SHOP_SETUP` says which one this run has:
 *
 * - `standard`, the default: wholesale off.
 * - `wholesale`: the storefront built and started with
 *   `SPREE_WHOLESALE_CHANNEL` set, which shows the wholesale section and links.
 * - `proxied`: the storefront started with `SPREE_API_URL` at the proxy this
 *   run starts (`proxy.ts`), which delays or fails the product list when a
 *   state asks, to show the featured products loading and a page failing.
 *   The backend also has a market that no product
 *   has a price in, for the country `FIDELITY_EMPTY_COUNTRY` (default `gb`),
 *   added before the storefront starts, so the home page has no products to
 *   feature. Start the storefront afresh, so nothing it fetched is cached.
 *
 * Where each capture is saved is described in `capture.ts`.
 */

const product = process.env.FIDELITY_PRODUCT ?? "the-spree-commerce-handbook";
const emptyCountry = process.env.FIDELITY_EMPTY_COUNTRY ?? "gb";

/** The focused element, described by its tag, its name and its text. */
const focused = () => {
  const element = document.activeElement;
  if (!element) return "nothing";
  const name = element.getAttribute("aria-label");
  const text = element.textContent?.trim();
  return `a ${element.tagName.toLowerCase()} element named "${name ?? text ?? ""}"${name === null && !text ? " (it has no name)" : ""}`;
};

const featured = (page: Page) =>
  page.locator(".featured-products").getByRole("heading", { level: 3 });

async function openHome(page: Page) {
  await open(page, "");
  await expect(featured(page).first()).toBeVisible({ timeout: 30_000 });
}

const header = (page: Page) => page.locator("header");
const footer = (page: Page) => page.locator("footer");
const menu = (page: Page) => page.getByRole("dialog", { name: "Menu" });
const regionDialog = (page: Page) =>
  page.getByRole("dialog", { name: "Region and language" });

async function openMenu(page: Page) {
  const button = page.getByRole("button", { name: "Open menu" });
  await waitForHydration(button);
  await button.click();
  await expect(menu(page).getByRole("link", { name: "Home" })).toBeVisible();
}

/** Opens a panel of the menu and waits for its "View all" link. */
async function openMenuPanel(page: Page, name: string) {
  await menu(page).getByRole("button", { name, exact: true }).click();
  await expect(
    menu(page).getByRole("link", { name: `View all ${name}` }),
  ).toBeVisible();
}

async function openSearch(page: Page) {
  const button = page.getByRole("button", { name: "Open search" });
  await waitForHydration(button);
  await button.click();
  const field = page.getByRole("combobox", { name: "Search..." });
  await expect(field).toBeFocused();
  return field;
}

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024;

/**
 * Opens the region and language dialog from the header's control on a desktop
 * and from the menu's on a phone, where the header has none.
 */
async function openRegionDialog(page: Page) {
  if (isDesktop(page)) {
    const control = header(page).getByRole("button", {
      name: "Region and language",
    });
    await waitForHydration(control);
    await control.click();
  } else {
    await openMenu(page);
    await menu(page)
      .getByRole("button", { name: "Region and language" })
      .click();
  }
  await expect(regionDialog(page)).toBeVisible();
}

async function chooseGermany(page: Page, language?: string) {
  await regionDialog(page)
    .getByRole("combobox", { name: "Region" })
    .selectOption("de");
  if (language) {
    await regionDialog(page)
      .getByRole("combobox", { name: "Language" })
      .selectOption(language);
  }
}

const updateButton = (page: Page) =>
  regionDialog(page).getByRole("button", {
    name: /update preferences|updating preferences/i,
  });

/** Adds the product to the cart and closes the cart drawer. */
async function addProductToCart(page: Page) {
  await open(page, `/products/${product}`);
  const name = await page.getByRole("heading", { level: 1 }).textContent();
  const drawer = await addToCart(page, name?.trim() ?? "");
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
}

const typed = async (page: Page, text: string) => {
  const field = await openSearch(page);
  await field.pressSequentially(text, { delay: 50 });
  return field;
};

const suggestions = (page: Page) => page.locator("#search-suggestions");

const captures: Capture[] = [
  // SF-SHOP-01 Home
  ...(["guest", "customer"] as const).map(
    (variant): Capture => ({
      screen: "SF-SHOP-01",
      state: "hero-and-featured",
      variant,
      reach: async (page) => {
        await openHome(page);
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
        return `Featured ${await featured(page).count()} products. The page's source holds ${blocks.length} block(s) of structured data for search engines: ${blocks.join("; ") || "none"}.`;
      },
    }),
  ),
  {
    screen: "SF-SHOP-01",
    state: "featured-loading",
    variant: "guest",
    setup: "proxied",
    oneVisit: true,
    note: "The proxy in front of the backend held the product list for 20 seconds, so the page showed what the storefront streams while it waits. The storefront had fetched nothing before, so nothing was cached. One visit shows this once, so the page was captured at 390 pixels and then widened to 1280 without reloading.",
    reach: async (page) => {
      proxy.productList = "delay";
      await page.goto("/us/en", { waitUntil: "commit" });
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expect(
        page.locator(".featured-products .animate-pulse").first(),
      ).toBeVisible();
    },
  },
  {
    screen: "SF-SHOP-01",
    state: "no-products",
    variant: "guest",
    setup: "proxied",
    note: "A market that no product has a price in, added to the backend for this capture only. Spree lists only the products priced in the market's currency.",
    reach: async (page) => {
      const observed = await visit(page, `/${emptyCountry}/en`);
      await expect(page.getByText("No products found")).toBeVisible();
      return observed;
    },
  },
  {
    screen: "SF-SHOP-01",
    state: "wholesale-section",
    variant: "guest",
    setup: "wholesale",
    reach: openHome,
  },

  // SF-OVL-01 Header, footer and mobile menu
  ...(["guest", "customer"] as const).map(
    (variant): Capture => ({
      screen: "SF-OVL-01",
      state: "header-empty-cart",
      variant,
      part: header,
      reach: openHome,
    }),
  ),
  {
    screen: "SF-OVL-01",
    state: "header-cart-count",
    variant: "guest",
    part: header,
    reach: async (page) => {
      await addProductToCart(page);
      await openHome(page);
      const button = page.getByRole("button", { name: "Open cart" });
      return `The cart button shows "${(await button.textContent())?.trim()}". Its accessible name is "${await button.getAttribute("aria-label")}", which replaces what it shows, so the count is not announced.`;
    },
  },
  {
    screen: "SF-OVL-01",
    state: "header-wholesale-link",
    variant: "guest",
    setup: "wholesale",
    only: 1280,
    note: "The header shows the wholesale link from 1024 pixels wide; on a phone the menu holds it.",
    part: header,
    reach: openHome,
  },
  ...(["guest", "customer"] as const).map(
    (variant): Capture => ({
      screen: "SF-OVL-01",
      state: "menu-main-panel",
      variant,
      window: true,
      reach: async (page) => {
        await openHome(page);
        await openMenu(page);
        return `Focus moved to ${await page.evaluate(focused)}.`;
      },
    }),
  ),
  {
    screen: "SF-OVL-01",
    state: "menu-category-panel",
    variant: "guest",
    window: true,
    reach: async (page) => {
      await openHome(page);
      await openMenu(page);
      await openMenuPanel(page, "Kitchen");
    },
  },
  {
    screen: "SF-OVL-01",
    state: "menu-subcategory-panel",
    variant: "guest",
    window: true,
    note: "The sample catalog's categories have one level below the top; the subcategories of Coffee Machines were added to this lane's test database through the Admin API to show this panel.",
    reach: async (page) => {
      await openHome(page);
      await openMenu(page);
      await openMenuPanel(page, "Kitchen");
      await openMenuPanel(page, "Coffee Machines");
    },
  },
  {
    screen: "SF-OVL-01",
    state: "menu-wholesale-link",
    variant: "guest",
    setup: "wholesale",
    window: true,
    reach: async (page) => {
      await openHome(page);
      await openMenu(page);
    },
  },
  {
    screen: "SF-OVL-01",
    state: "footer",
    variant: "guest",
    part: footer,
    reach: openHome,
  },
  {
    screen: "SF-OVL-01",
    state: "footer-wholesale-link",
    variant: "guest",
    setup: "wholesale",
    part: footer,
    reach: openHome,
  },

  // SF-OVL-03 Search
  {
    screen: "SF-OVL-03",
    state: "open",
    variant: "guest",
    window: true,
    reach: async (page) => {
      await openHome(page);
      await openSearch(page);
    },
  },
  {
    screen: "SF-OVL-03",
    state: "one-letter",
    variant: "guest",
    window: true,
    reach: async (page) => {
      await openHome(page);
      await typed(page, "k");
      await page.waitForTimeout(600);
      await expect(suggestions(page)).toHaveCount(0);
    },
  },
  {
    screen: "SF-OVL-03",
    state: "searching",
    variant: "guest",
    window: true,
    note: "The search was left unanswered in the browser to show it in progress; this claims nothing about the server.",
    reach: async (page) => {
      await openHome(page);
      await interceptActions(page, "hold");
      await typed(page, "kettle");
      await expect(page.getByText("Searching...")).toBeVisible();
    },
  },
  {
    screen: "SF-OVL-03",
    state: "suggestions",
    variant: "guest",
    window: true,
    reach: async (page) => {
      await openHome(page);
      await typed(page, "kettle");
      await expect(suggestions(page).getByRole("option").first()).toBeVisible({
        timeout: 30_000,
      });
      return `Suggested ${await suggestions(page).getByRole("option").count()} products.`;
    },
  },
  {
    screen: "SF-OVL-03",
    state: "keyboard-choice",
    variant: "guest",
    window: true,
    reach: async (page) => {
      await openHome(page);
      const field = await typed(page, "kettle");
      await expect(suggestions(page).getByRole("option").nth(1)).toBeVisible({
        timeout: 30_000,
      });
      await field.press("ArrowDown");
      await field.press("ArrowDown");
      const chosen = suggestions(page).locator('[aria-selected="true"]');
      await expect(chosen).toHaveCount(1);
      return `Pressed the down arrow twice; "${(await chosen.textContent())?.trim()}" is chosen, and the field names it as its active option: ${(await field.getAttribute("aria-activedescendant")) !== null}.`;
    },
  },
  {
    screen: "SF-OVL-03",
    state: "no-results",
    variant: "guest",
    window: true,
    reach: async (page) => {
      await openHome(page);
      await typed(page, "teapot");
      await expect(page.getByText("No products found")).toBeVisible({
        timeout: 30_000,
      });
    },
  },

  // SF-OVL-04 Region and language
  {
    screen: "SF-OVL-04",
    state: "header-control",
    variant: "guest",
    only: 1280,
    note: "The header shows the control from 1024 pixels wide; on a phone the menu holds it.",
    part: header,
    reach: openHome,
  },
  {
    screen: "SF-OVL-04",
    state: "menu-control",
    variant: "guest",
    only: 390,
    window: true,
    note: "The menu shows the control below 1024 pixels wide, where the header has none.",
    reach: async (page) => {
      await openHome(page);
      await openMenu(page);
      await menu(page)
        .getByRole("button", { name: "Region and language" })
        .scrollIntoViewIfNeeded();
    },
  },
  {
    screen: "SF-OVL-04",
    state: "dialog",
    variant: "guest",
    window: true,
    reach: async (page) => {
      await openHome(page);
      await openRegionDialog(page);
    },
  },
  {
    screen: "SF-OVL-04",
    state: "another-country",
    variant: "guest",
    window: true,
    reach: async (page) => {
      await openHome(page);
      await openRegionDialog(page);
      await chooseGermany(page);
      const language = regionDialog(page).getByRole("combobox", {
        name: "Language",
      });
      const options = await language.locator("option").allTextContents();
      return `Chose Germany. The language stays ${await language.inputValue()}; the choices are ${options.join(", ")}.`;
    },
  },
  {
    screen: "SF-OVL-04",
    state: "updating",
    variant: "guest",
    window: true,
    note: "With a product in the cart, which moves to the new currency first. That request was left unanswered in the browser to show the dialog waiting; this claims nothing about the server.",
    reach: async (page) => {
      await addProductToCart(page);
      await openHome(page);
      await openRegionDialog(page);
      await chooseGermany(page, "de");
      await interceptActions(page, "hold");
      await updateButton(page).click();
      await expect(updateButton(page)).toHaveText("Updating preferences...");
      await expect(updateButton(page)).toBeDisabled();
    },
  },
  {
    screen: "SF-OVL-04",
    state: "failed",
    variant: "guest",
    window: true,
    note: "With a product in the cart, which moves to the new currency first. That request was failed in the browser to show the dialog's message; this claims nothing about the server.",
    reach: async (page) => {
      await addProductToCart(page);
      await openHome(page);
      await openRegionDialog(page);
      await chooseGermany(page, "de");
      await interceptActions(page, "fail");
      await updateButton(page).click();
      await expect(
        regionDialog(page).getByText(
          "We couldn't update your region preferences. Please try again.",
        ),
      ).toBeVisible();
    },
  },
  {
    screen: "SF-OVL-04",
    state: "after-switching",
    variant: "guest",
    reach: async (page) => {
      await openHome(page);
      await openRegionDialog(page);
      await chooseGermany(page, "de");
      await updateButton(page).click();
      await page.waitForURL(/\/de\/de$/, { timeout: 30_000 });
      await page.waitForLoadState("networkidle");
      await expect(featured(page).first()).toBeVisible({ timeout: 30_000 });
      return "Chose Germany and German, and updated the preferences without a cart.";
    },
  },

  // SF-SHOP-06 Policy
  {
    screen: "SF-SHOP-06",
    state: "formatted-content",
    variant: "guest",
    reach: (page) => visit(page, "/us/en/policies/returns-policy"),
  },
  {
    screen: "SF-SHOP-06",
    state: "no-content",
    variant: "guest",
    reach: (page) => visit(page, "/us/en/policies/shipping-policy"),
  },
  {
    screen: "SF-SHOP-06",
    state: "not-found",
    variant: "guest",
    note: "Found behaviour: the page says it was not found, but is answered with status 200 rather than 404.",
    reach: (page) => visit(page, "/us/en/policies/no-such-policy"),
  },

  // SF-SYS-01 Application error page
  {
    screen: "SF-SYS-01",
    state: "page-fails",
    variant: "guest",
    setup: "proxied",
    note: "The proxy in front of the backend answered the product list with a server error, so the page could not load its data.",
    reach: (page) => {
      proxy.productList = "fail";
      return visit(
        page,
        `/us/en/products?q=fidelity-${Date.now().toString(36)}`,
      );
    },
  },
  {
    screen: "SF-SYS-01",
    state: "malformed-address",
    variant: "guest",
    note: "Found behaviour: an address the storefront cannot decode is answered with a plain-text error, not the application error page.",
    reach: (page) => visit(page, "/us/en/products/%E0%A4%A"),
  },

  // SF-SYS-02 Not found
  {
    screen: "SF-SYS-02",
    state: "unknown-policy",
    variant: "guest",
    note: "Found behaviour: the page says it was not found, but is answered with status 200 rather than 404.",
    reach: (page) => visit(page, "/us/en/policies/no-such-policy"),
  },
  {
    screen: "SF-SYS-02",
    state: "unknown-page",
    variant: "guest",
    reach: (page) => visit(page, "/us/en/no-such-page"),
  },
  {
    screen: "SF-SYS-02",
    state: "unknown-language",
    variant: "guest",
    reach: (page) => visit(page, "/us/xx"),
  },
  {
    screen: "SF-SYS-02",
    state: "unknown-country",
    variant: "guest",
    reach: (page) => visit(page, "/zz/en"),
  },
];

runCaptures(captures);
