import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import {
  type Browser,
  expect,
  type Locator,
  type Page,
  test,
} from "@playwright/test";

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
