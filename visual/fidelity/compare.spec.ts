import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  type Browser,
  expect,
  type Locator,
  type Page,
  test,
} from "@playwright/test";
import { signIn } from "../../e2e/support";
import { readAccounts } from "./accounts";

/**
 * The pilot's diagnostic comparison with the running storefront (LIQ-010
 * §12.1): each story beside the same component on the running storefront, in
 * the same browser. It gathers evidence for a person to review and passes
 * whenever it can capture both sides, so a successful run alone does not
 * establish that a story matches its screen.
 *
 * Before running, start at the revision under test:
 *   1. a Spree backend with a publishable key, a product listed on the key's
 *      channel, and customer sign-up open;
 *   2. the built storefront on port 3001 (`pnpm build && pnpm start`), with
 *      `SPREE_API_URL` and `SPREE_PUBLISHABLE_KEY` pointing at that backend;
 *   3. the built Storybook on port 6008
 *      (`node stories/scripts/serve.mjs storybook-static 6008`).
 *
 * The account cases open the screens as the test customer `screens.spec.ts`
 * describes, so they also need `FIDELITY_ACCOUNTS`.
 *
 * Set `FIDELITY_PRODUCT` to the listed product's slug, and `FIDELITY_REVISION`
 * to the commit under test to record it in each file. For each case it saves
 * both images side by side, and the computed styles of both sides with the
 * differences between them, to `visual/fidelity/results/`. The data differs on
 * purpose: the screen shows the backend's product and the stories show
 * invented ones.
 */

const STORYBOOK = "http://localhost:6008";
const STOREFRONT = "http://localhost:3001";
const product = process.env.FIDELITY_PRODUCT ?? "e2e-promo-product";
const revision = process.env.FIDELITY_REVISION ?? null;
const results = path.join(__dirname, "results/");
const fontsFolder = path.join(__dirname, "../fonts");

/** The styles compared on every element, chosen to catch a wrong token, size or variant. */
const properties = [
  "color",
  "background-color",
  "font-family",
  "font-size",
  "font-weight",
  "line-height",
  "letter-spacing",
  "border-top-width",
  "border-top-color",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "border-radius",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "height",
  "box-shadow",
  "opacity",
  "gap",
];

type Styles = Record<string, Record<string, string>>;

declare global {
  interface Window {
    __STORYBOOK_PREVIEW__?: {
      currentRender?: {
        phase?: string;
        story?: { parameters?: Record<string, any> };
      };
    };
  }
}

/**
 * The computed styles of the target and everything inside it, one entry for
 * each distinct element (tag, classes and slot), so the same part on both sides
 * is compared however many rows the data gives it.
 *
 * The built storefront's stylesheet writes colours in another colour space
 * than Storybook's, so each colour is compared as the pixel it paints.
 */
async function collectStyles(
  target: Locator,
  names = properties,
  deep = true,
): Promise<Styles> {
  return target.evaluate(
    (root, { names, deep }) => {
      const context = document
        .createElement("canvas")
        .getContext("2d", { willReadFrequently: true });
      const painted = (value: string) => {
        if (!context || !/(rgb|lab|lch|oklab|oklch|color)\(/.test(value)) {
          return value;
        }
        return value.replace(
          /(?:rgba?|lab|lch|oklab|oklch|color)\([^()]*\)/g,
          (colour) => {
            context.clearRect(0, 0, 1, 1);
            context.fillStyle = colour;
            context.fillRect(0, 0, 1, 1);
            return `rgba(${context.getImageData(0, 0, 1, 1).data.join(", ")})`;
          },
        );
      };
      const styles: Record<string, Record<string, string>> = {};
      const visit = (element: Element) => {
        const key = [
          element.tagName.toLowerCase(),
          element.getAttribute("data-slot") ?? "",
          element.getAttribute("class") ?? "",
        ].join("|");
        if (!styles[key]) {
          const computed = getComputedStyle(element);
          styles[key] = Object.fromEntries(
            names.map((name) => [
              name,
              painted(computed.getPropertyValue(name)),
            ]),
          );
        }
        if (deep) for (const child of element.children) visit(child);
      };
      visit(root);
      return styles;
    },
    { names, deep },
  );
}

function compareStyles(screen: Styles, story: Styles) {
  const differences: {
    element: string;
    property: string;
    screen: string;
    story: string;
  }[] = [];
  for (const [element, values] of Object.entries(screen)) {
    const other = story[element];
    if (!other) continue;
    for (const property of properties) {
      if (values[property] !== other[property]) {
        differences.push({
          element,
          property,
          screen: values[property],
          story: other[property],
        });
      }
    }
  }
  return {
    compared: Object.keys(screen).filter((element) => element in story).length,
    onlyOnScreen: Object.keys(screen).filter((element) => !(element in story)),
    onlyInStory: Object.keys(story).filter((element) => !(element in screen)),
    differences,
  };
}

async function openStory(page: Page, id: string) {
  // Storybook's stand-in for the font loader links Geist from Google; the
  // visual check's copies of the files the built storefront serves answer it.
  await page.route("https://fonts.gstatic.com/**", (route) => {
    const font = path.join(
      fontsFolder,
      path.basename(new URL(route.request().url()).pathname),
    );
    return existsSync(font)
      ? route.fulfill({ path: font, contentType: "font/woff2" })
      : route.abort();
  });
  await page.goto(`${STORYBOOK}/iframe.html?id=${id}&viewMode=story`);
  await page.waitForFunction(() =>
    ["completed", "finished", "afterEach"].includes(
      window.__STORYBOOK_PREVIEW__?.currentRender?.phase ?? "",
    ),
  );
  await page.evaluate(() => document.fonts.ready);
  await page.waitForLoadState("networkidle");
}

async function sideBySide(
  page: Page,
  screen: Buffer,
  story: Buffer,
  path: string,
) {
  const image = (buffer: Buffer) =>
    `data:image/png;base64,${buffer.toString("base64")}`;
  await page.setContent(`
    <body style="margin:0;font:14px sans-serif;display:flex;gap:16px;padding:16px;background:#ddd;width:max-content">
      <figure style="margin:0"><figcaption>Running screen</figcaption><img src="${image(screen)}"></figure>
      <figure style="margin:0"><figcaption>Story</figcaption><img src="${image(story)}"></figure>
    </body>`);
  await page.screenshot({ path, fullPage: true });
}

async function storefrontPage(page: Page, path: string) {
  await page.goto(`${STOREFRONT}/us/en${path}`);
  await page.waitForLoadState("networkidle");
}

async function addToCart(page: Page) {
  await storefrontPage(page, `/products/${product}`);
  await page.getByRole("button", { name: "Add to Cart" }).first().click();
}

/** Opens the cart from the keyboard, so focus moves into the drawer as it does for a keyboard user. */
async function openCartWithKeyboard(page: Page) {
  await page.getByRole("button", { name: "Open cart" }).focus();
  await page.keyboard.press("Enter");
}

/** Signs a new customer up, so the profile page can raise its toast. */
async function signUp(page: Page) {
  await storefrontPage(page, "/account/register");
  await page.getByLabel("First name").fill("Fidelity");
  await page.getByLabel("Last name").fill("Check");
  await page.getByLabel("Email").fill(`fidelity-${Date.now()}@example.com`);
  await page.getByLabel("Password", { exact: true }).fill("spree123");
  await page.getByLabel("Confirm password").fill("spree123");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Create Account" }).click();
  await page.waitForURL(/\/account(?!\/register)/);
}

/** Signs the test customer in and opens one of their account pages. */
async function customerPage(page: Page, path: string) {
  const { customer } = readAccounts();
  await storefrontPage(page, "/account");
  await signIn(page, customer.email, customer.password);
  await expect(
    page.getByRole("heading", { name: "Account Overview" }),
  ).toBeVisible({ timeout: 30_000 });
  if (path) await storefrontPage(page, path);
  // Signing in leaves the pointer where the button was, over the next page.
  await page.mouse.move(0, 0);
}

/** The account column a page's story sits in (`stories/decorators/account-column.tsx`). */
const accountColumn = (page: Page) =>
  page.locator("#storybook-root div.flex-1.min-w-0");

/** The test customer's shipped order. */
const shippedOrder = (page: Page) =>
  customerPage(page, `/account/orders/${readAccounts().orders.shipped}`);

/** Opens the address editor for the customer's studio address. */
async function editStudioAddress(page: Page) {
  await customerPage(page, "/account/addresses");
  await page
    .locator("div.rounded-xl", { hasText: "2200 Mission Street" })
    .getByRole("button", { name: "Edit" })
    .click();
}

interface Mode {
  name: string;
  width: number;
  colorScheme: "light" | "dark";
}

/** The visual check's modes (visual/modes.ts). */
const desktop: Mode = { name: "desktop", width: 1280, colorScheme: "light" };
const mobile: Mode = { name: "mobile", width: 390, colorScheme: "light" };
const systemDark: Mode = {
  name: "desktop-system-dark",
  width: 1280,
  colorScheme: "dark",
};

interface Case {
  /** LIQ-009 inventory ID. */
  id: string;
  /** What is compared, for the results folder. */
  name: string;
  /** The story's ID in the built Storybook. */
  story: string;
  modes: Mode[];
  /** The screen and the story are captured whole, for drawers and toasts. */
  viewport?: boolean;
  /** Opens the running screen and returns the component there. */
  screen: (page: Page) => Promise<Locator>;
  /** The component in the story. */
  inStory: (page: Page) => Locator;
}

const drawer = (page: Page) => page.locator('[data-slot="sheet-content"]');
const toast = (page: Page) => page.locator("[data-sonner-toast]").first();

const cases: Case[] = [
  {
    id: "CMP-SF-G-05",
    name: "hero-section",
    story: "storefront-home-hero-section--default",
    modes: [desktop, mobile],
    screen: async (page) => {
      await storefrontPage(page, "");
      return page.locator("main section").first();
    },
    inStory: (page) => page.locator("section").first(),
  },
  {
    id: "CMP-SF-P-04",
    name: "button-large",
    story: "storefront-ui-button--sizes",
    modes: [desktop, mobile],
    screen: async (page) => {
      await storefrontPage(page, `/products/${product}`);
      return page.getByRole("button", { name: "Add to Cart" }).first();
    },
    inStory: (page) =>
      page.locator('[data-slot="button"]').filter({ hasText: /^lg$/ }),
  },
  {
    id: "CMP-SF-G-03",
    name: "cart-drawer-empty",
    story: "storefront-cart-cart-drawer--empty",
    modes: [desktop, mobile],
    viewport: true,
    screen: async (page) => {
      await storefrontPage(page, "");
      await page.getByRole("button", { name: "Open cart" }).click();
      return drawer(page);
    },
    inStory: drawer,
  },
  {
    id: "CMP-SF-G-03",
    name: "cart-drawer-with-items",
    story: "storefront-cart-cart-drawer--with-items",
    modes: [desktop, mobile],
    viewport: true,
    screen: async (page) => {
      await addToCart(page);
      return drawer(page);
    },
    inStory: drawer,
  },
  {
    id: "CMP-SF-G-03",
    name: "cart-drawer-empty-keyboard",
    story: "storefront-cart-cart-drawer--empty",
    modes: [desktop, mobile],
    viewport: true,
    screen: async (page) => {
      await storefrontPage(page, "");
      await openCartWithKeyboard(page);
      return drawer(page);
    },
    inStory: drawer,
  },
  {
    id: "CMP-SF-G-03",
    name: "cart-drawer-with-items-keyboard",
    story: "storefront-cart-cart-drawer--with-items",
    modes: [desktop, mobile],
    viewport: true,
    screen: async (page) => {
      await addToCart(page);
      await page.keyboard.press("Escape");
      await expect(drawer(page)).toBeHidden();
      await openCartWithKeyboard(page);
      return drawer(page);
    },
    inStory: drawer,
  },
  {
    id: "CMP-SF-P-21",
    name: "toaster-success",
    story: "storefront-ui-toaster--success",
    modes: [desktop, systemDark],
    viewport: true,
    screen: async (page) => {
      await signUp(page);
      await storefrontPage(page, "/account/profile");
      await page.getByRole("button", { name: "Save Changes" }).click();
      return toast(page);
    },
    inStory: toast,
  },
  // Storefront shopper accounts. Three primitives appear on the account
  // screens only inside one component, so each is compared within it: the
  // label (CMP-SF-P-13) within the field (P-10), the checkbox (P-07), which
  // the consent gives a top margin, within the policy consent (G-09), and the
  // dialog (P-08), whose default story adds a header and close button no
  // account screen has, within the address editor (G-04).
  {
    id: "CMP-SF-P-05",
    name: "card-sign-in",
    story: "storefront-ui-card--default",
    modes: [desktop, mobile],
    screen: async (page) => {
      await storefrontPage(page, "/account");
      return page.locator('[data-slot="card"]').first();
    },
    inStory: (page) => page.locator('[data-slot="card"]').first(),
  },
  {
    id: "CMP-SF-P-10",
    name: "field-sign-in",
    story: "storefront-ui-field--default",
    modes: [desktop, mobile],
    screen: async (page) => {
      await storefrontPage(page, "/account");
      return page.locator('[data-slot="field"]').first();
    },
    inStory: (page) => page.locator('[data-slot="field"]').first(),
  },
  {
    id: "CMP-SF-P-12",
    name: "input-sign-in",
    story: "storefront-ui-input--default",
    modes: [desktop, mobile],
    screen: async (page) => {
      await storefrontPage(page, "/account");
      return page.locator('[data-slot="input"]').first();
    },
    inStory: (page) => page.locator('[data-slot="input"]').first(),
  },
  {
    id: "CMP-SF-P-02",
    name: "alert-wrong-password",
    story: "storefront-ui-alert--destructive",
    modes: [desktop, mobile],
    screen: async (page) => {
      await storefrontPage(page, "/account");
      await signIn(page, readAccounts().customer.email, "not-the-password");
      return page.locator('[data-slot="alert"]');
    },
    inStory: (page) => page.locator('[data-slot="alert"]'),
  },
  {
    id: "CMP-SF-G-09",
    name: "policy-consent-register",
    story: "storefront-policy-policy-consent--unchecked",
    modes: [desktop, mobile],
    screen: async (page) => {
      await storefrontPage(page, "/account/register");
      return page
        .locator("div", { has: page.locator('[data-slot="checkbox"]') })
        .last();
    },
    inStory: (page) =>
      page
        .locator("div", { has: page.locator('[data-slot="checkbox"]') })
        .last(),
  },
  {
    id: "CMP-SF-G-01",
    name: "account-shell",
    story: "storefront-account-account-shell--overview",
    modes: [desktop, mobile],
    screen: async (page) => {
      await customerPage(page, "");
      return page.locator("div.container", {
        has: page.getByRole("complementary"),
      });
    },
    inStory: (page) =>
      page.locator("div.container", { has: page.getByRole("complementary") }),
  },
  {
    id: "CMP-SF-G-01",
    name: "order-list",
    story: "storefront-account-order-list--orders-listed",
    modes: [desktop, mobile],
    screen: async (page) => {
      await customerPage(page, "/account/orders");
      return page.locator("div.rounded-xl", { has: page.locator("table") });
    },
    inStory: (page) =>
      page.locator("div.rounded-xl", { has: page.locator("table") }),
  },
  {
    id: "CMP-SF-G-01",
    name: "order-detail-shipped",
    story: "storefront-account-order-detail--shipped",
    modes: [desktop, mobile],
    screen: async (page) => {
      await shippedOrder(page);
      return page
        .locator("div", {
          has: page.getByRole("link", { name: "Back to orders" }),
        })
        .last();
    },
    inStory: (page) =>
      page
        .locator("div", {
          has: page.getByRole("link", { name: "Back to orders" }),
        })
        .last(),
  },
  {
    id: "CMP-SF-G-01",
    name: "gift-card-list",
    story: "storefront-account-gift-card-list--every-state",
    modes: [desktop, mobile],
    screen: async (page) => {
      await customerPage(page, "/account/gift-cards");
      return page
        .getByRole("heading", { level: 1, name: "Gift Cards" })
        .locator("..");
    },
    inStory: accountColumn,
  },
  {
    id: "CMP-SF-G-08",
    name: "fulfillment-block-shipped",
    story: "storefront-order-fulfillment-block--shipped",
    modes: [desktop, mobile],
    screen: async (page) => {
      await shippedOrder(page);
      return page
        .locator("div.rounded-xl", { hasText: "Shipping Method" })
        .first();
    },
    inStory: (page) => page.locator("#storybook-root div.rounded-xl").first(),
  },
  {
    id: "CMP-SF-G-08",
    name: "address-block",
    story: "storefront-order-address-block--full",
    modes: [desktop, mobile],
    screen: async (page) => {
      await shippedOrder(page);
      return page.locator('div[class*="space-y-0.5"]').first();
    },
    inStory: (page) => page.locator('div[class*="space-y-0.5"]').first(),
  },
  {
    id: "CMP-SF-G-08",
    name: "line-item-card",
    story: "storefront-order-line-item-card--without-image",
    modes: [desktop, mobile],
    screen: async (page) => {
      await shippedOrder(page);
      return page.locator("div.flex.gap-4", { hasText: "Order again" }).first();
    },
    inStory: (page) =>
      page.locator("div.flex.gap-4", { hasText: "Order again" }).first(),
  },
  {
    id: "CMP-SF-P-16",
    name: "product-image-none",
    story: "storefront-ui-product-image--no-image",
    modes: [desktop, mobile],
    screen: async (page) => {
      await shippedOrder(page);
      return page.locator("div.absolute.inset-0.bg-gray-100").first();
    },
    inStory: (page) => page.locator("div.absolute.inset-0.bg-gray-100").first(),
  },
  {
    id: "CMP-SF-G-08",
    name: "payment-info-other-method",
    story: "storefront-order-payment-info--other-method",
    modes: [desktop, mobile],
    screen: async (page) => {
      await shippedOrder(page);
      return page.locator("div.mb-3 > :first-child").first();
    },
    inStory: (page) => page.locator("#storybook-root > *").first(),
  },
  {
    id: "CMP-SF-G-08",
    name: "order-totals",
    story: "storefront-order-order-totals--default",
    modes: [desktop, mobile],
    screen: async (page) => {
      await shippedOrder(page);
      return page.locator("div.space-y-2", { hasText: "Subtotal" }).last();
    },
    inStory: (page) =>
      page.locator("div.space-y-2", { hasText: "Subtotal" }).last(),
  },
  {
    id: "CMP-SF-G-02",
    name: "address-management",
    story: "storefront-addresses-address-management--addresses-listed",
    modes: [desktop, mobile],
    screen: async (page) => {
      await customerPage(page, "/account/addresses");
      return page
        .getByRole("heading", { level: 1, name: "Addresses" })
        .locator("../..");
    },
    inStory: accountColumn,
  },
  {
    id: "CMP-SF-G-04",
    name: "address-edit-modal-editing",
    story: "storefront-checkout-address-edit-modal--editing",
    modes: [desktop, mobile],
    viewport: true,
    screen: async (page) => {
      await editStudioAddress(page);
      return page.locator('[data-slot="dialog-content"]');
    },
    inStory: (page) => page.locator('[data-slot="dialog-content"]'),
  },
  {
    id: "CMP-SF-P-14",
    name: "native-select-country",
    story: "storefront-ui-native-select--focused",
    modes: [desktop, mobile],
    screen: async (page) => {
      await editStudioAddress(page);
      return page.locator('[data-slot="native-select-wrapper"]').first();
    },
    inStory: (page) =>
      page.locator('[data-slot="native-select-wrapper"]').first(),
  },
  {
    id: "CMP-SF-P-01",
    name: "alert-dialog-delete-address",
    story: "storefront-ui-alert-dialog--default",
    modes: [desktop, mobile],
    viewport: true,
    screen: async (page) => {
      await customerPage(page, "/account/addresses");
      await page.getByRole("button", { name: "Delete" }).first().click();
      return page.locator('[data-slot="alert-dialog-content"]');
    },
    inStory: (page) => page.locator('[data-slot="alert-dialog-content"]'),
  },
];

async function newPage(browser: Browser, mode: Mode) {
  const page = await browser.newPage({
    viewport: { width: mode.width, height: 800 },
  });
  await page.emulateMedia({
    colorScheme: mode.colorScheme,
    reducedMotion: "reduce",
  });
  return page;
}

/** The custom properties the page's root element defines: the tokens. */
async function tokenNames(page: Page): Promise<string[]> {
  return page.evaluate(() =>
    Array.from(getComputedStyle(document.documentElement)).filter((name) =>
      name.startsWith("--"),
    ),
  );
}

test("tokens on the running storefront and in Storybook", async ({
  browser,
}) => {
  const page = await newPage(browser, desktop);
  await storefrontPage(page, "");
  const storyPage = await newPage(browser, desktop);
  await openStory(storyPage, "storefront-ui-button--default");

  const onScreen = await tokenNames(page);
  const inStory = await tokenNames(storyPage);
  const names = [...new Set([...onScreen, ...inStory])];
  const root = async (target: Page) =>
    Object.values(await collectStyles(target.locator("html"), names, false))[0];
  const screen = await root(page);
  const story = await root(storyPage);

  mkdirSync(`${results}tokens/`, { recursive: true });
  writeFileSync(
    `${results}tokens/desktop.json`,
    JSON.stringify(
      {
        revision,
        counts: { storefront: onScreen.length, storybook: inStory.length },
        differing: names
          .filter((name) => screen[name] !== story[name])
          .map((name) => ({
            name,
            screen: onScreen.includes(name) ? screen[name] : null,
            story: inStory.includes(name) ? story[name] : null,
          })),
      },
      null,
      2,
    ),
  );
  await page.close();
  await storyPage.close();
});

for (const item of cases) {
  for (const mode of item.modes) {
    test(`${item.id} ${item.name} ${mode.name}`, async ({ browser }) => {
      const folder = `${results}${item.name}/`;
      mkdirSync(folder, { recursive: true });

      const page = await newPage(browser, mode);
      const onScreen = await item.screen(page);
      await expect(onScreen).toBeVisible({ timeout: 20_000 });
      await page.waitForTimeout(500);
      const screenImage = item.viewport
        ? await page.screenshot()
        : await onScreen.screenshot();
      const screenStyles = await collectStyles(onScreen);
      const screenWidth = (await onScreen.boundingBox())?.width;

      const storyPage = await newPage(browser, mode);
      await openStory(storyPage, item.story);
      const inStory = item.inStory(storyPage);
      await expect(inStory).toBeVisible();
      const storyImage = item.viewport
        ? await storyPage.screenshot()
        : await inStory.screenshot();
      const storyStyles = await collectStyles(inStory);
      const storyWidth = (await inStory.boundingBox())?.width;

      writeFileSync(`${folder}${mode.name}-screen.png`, screenImage);
      writeFileSync(`${folder}${mode.name}-story.png`, storyImage);
      await sideBySide(
        storyPage,
        screenImage,
        storyImage,
        `${folder}${mode.name}-side-by-side.png`,
      );
      writeFileSync(
        `${folder}${mode.name}-styles.json`,
        JSON.stringify(
          {
            id: item.id,
            story: item.story,
            mode: mode.name,
            revision,
            screenWidth,
            storyWidth,
            ...compareStyles(screenStyles, storyStyles),
            styles: { screen: screenStyles, story: storyStyles },
          },
          null,
          2,
        ),
      );
      await page.close();
      await storyPage.close();
    });
  }
}
