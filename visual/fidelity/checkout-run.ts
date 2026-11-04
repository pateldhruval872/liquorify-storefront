import { expect, type Locator, type Page } from "@playwright/test";
import { waitForHydration } from "../../e2e/support";

/**
 * What the checkout captures share (`checkout-screens.spec.ts`,
 * `checkout-settings.spec.ts`): reaching checkout from a product page as a
 * shopper does, and filling it in. Every address and email is invented.
 */

/** A sample product that ships, and the digital one (Spree's sample handbook). */
export const products = {
  physical: process.env.FIDELITY_CHECKOUT_PRODUCT ?? "drip-coffee-maker",
  second: process.env.FIDELITY_CHECKOUT_SECOND_PRODUCT ?? "personal-blender",
  digital:
    process.env.FIDELITY_DIGITAL_PRODUCT ?? "the-spree-commerce-handbook",
};

export interface ShopperAddress {
  country: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
}

export const guestEmail = "jordan.ellis@example.com";

export const unitedStatesAddress: ShopperAddress = {
  country: "United States",
  firstName: "Jordan",
  lastName: "Ellis",
  address: "55 Water Street",
  city: "Brooklyn",
  state: "New York",
  zip: "11201",
  phone: "718-555-0155",
};

export const billingAddress: ShopperAddress = {
  ...unitedStatesAddress,
  address: "200 Park Avenue",
  city: "New York",
  zip: "10166",
};

export const spainAddress: ShopperAddress = {
  country: "Spain",
  firstName: "Lucia",
  lastName: "Ortega",
  address: "Calle de Alcala 42",
  city: "Madrid",
  state: "Madrid",
  zip: "28014",
  phone: "600 000 000",
};

/** A customer's two saved addresses, added through the account's address book. */
export const savedAddresses: ShopperAddress[] = [
  {
    ...unitedStatesAddress,
    address: "148 Orchard Street",
    city: "New York",
    zip: "10002",
  },
  {
    ...unitedStatesAddress,
    address: "2200 Mission Street",
    city: "San Francisco",
    state: "California",
    zip: "94110",
  },
];

export const cartDrawer = (page: Page) =>
  page.getByRole("dialog", { name: /^cart/i });

/**
 * Adds a product from its page; the cart drawer opens and lists it. The
 * drawer links both the item's picture and its name to the product, so the
 * first is waited for (the browser tests' helper expects one, B12).
 */
export async function addProduct(page: Page, product: string, base = "/us/en") {
  // Not waiting for the network to settle: the storefront's prefetches of other
  // pages can stay open for half a minute once the cart has an item.
  await page.goto(`${base}/products/${product}`);
  const name = (await page.getByRole("heading", { level: 1 }).textContent())
    ?.trim()
    .replace(/\s+/g, " ");
  const addButton = page.getByRole("button", { name: /add to cart/i });
  await waitForHydration(addButton);
  await expect(addButton).toBeEnabled({ timeout: 10_000 });
  await addButton.click();
  const drawer = cartDrawer(page);
  await expect(
    drawer.getByRole("link", { name: name ?? "" }).first(),
  ).toBeVisible({ timeout: 30_000 });
  return drawer;
}

/**
 * Adds each product and goes to checkout from the drawer's Checkout link, as
 * the storefront's checkout test does. Answers the cart's ID, which is in the
 * address.
 */
export async function startCheckout(
  page: Page,
  { items = [products.physical], base = "/us/en" } = {},
) {
  let drawer: Locator | undefined;
  for (const product of items) {
    if (drawer) {
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
    }
    drawer = await addProduct(page, product, base);
  }
  const link = drawer?.getByRole("link", { name: /^checkout$/i });
  const href = await link?.getAttribute("href");
  if (!href) throw new Error("The cart drawer has no Checkout link");
  await openCheckout(page, href);
  return href.split("/").pop() ?? "";
}

export async function openCheckout(page: Page, address: string) {
  await page.goto(address);
  await page.waitForLoadState("networkidle");
  // The streamed page briefly holds two copies of the form while it hydrates.
  await expect(
    page.getByRole("heading", { name: "Shipping Method" }),
  ).toHaveCount(1, { timeout: 30_000 });
}

/** Fills an address form, in checkout or in a dialog. */
export async function fillAddressForm(
  scope: Page | Locator,
  address: ShopperAddress,
) {
  await scope
    .getByLabel("Country", { exact: true })
    .selectOption({ label: address.country });
  await scope.getByLabel("First name").first().fill(address.firstName);
  await scope.getByLabel("Last name").first().fill(address.lastName);
  await scope
    .getByLabel("Address", { exact: true })
    .first()
    .fill(address.address);
  await scope.getByLabel("City").first().fill(address.city);
  await scope.getByLabel("ZIP / Postal code").first().fill(address.zip);
  await scope.getByLabel("Phone (optional)").first().fill(address.phone);
  await scope
    .getByLabel("State / Province")
    .first()
    .selectOption({ label: address.state });
}

/**
 * A guest's email and shipping address. Checkout saves the address when focus
 * leaves the form, so the shipping heading is clicked; the delivery section
 * then lists the cart's rates, or keeps asking for an address when Spree
 * offers none for it.
 */
export async function fillGuestCheckout(
  page: Page,
  address: ShopperAddress = unitedStatesAddress,
  email = guestEmail,
) {
  const emailField = page.getByPlaceholder("Email address");
  await waitForHydration(emailField);
  await emailField.fill(email);
  await fillAddressForm(page, address);
  await page.getByRole("heading", { name: "Shipping Method" }).click();
  await page.waitForLoadState("networkidle");
  await deliverySection(page)
    .getByRole("radio")
    .first()
    .waitFor({ timeout: 10_000 })
    .catch(() => undefined);
  await page.waitForLoadState("networkidle");
}

const deliverySection = (page: Page) =>
  page.getByRole("heading", { name: "Shipping Method" }).locator("xpath=..");

/** The rates the delivery section lists, as "name price" lines. */
export async function ratesShown(page: Page) {
  const radios = deliverySection(page).getByRole("radio");
  const rates: string[] = [];
  for (const radio of await radios.all()) {
    const row = radio.locator("xpath=ancestor::label[1]");
    rates.push(
      ((await row.count()) ? await row.innerText() : await radio.innerText())
        .replace(/\s+/g, " ")
        .trim(),
    );
  }
  return rates.length ? rates.join("; ") : "none";
}

export async function chooseRate(page: Page, name: RegExp) {
  await deliverySection(page).getByRole("radio", { name }).click();
  await page.waitForLoadState("networkidle");
}

export const paymentSection = (page: Page) =>
  page.getByRole("heading", { name: "Payment Method" }).locator("xpath=..");

/** What the payment section offers, as it reads. */
export async function methodsShown(page: Page) {
  const text = (await paymentSection(page).innerText())
    .replace(/\s+/g, " ")
    .trim();
  return `The payment section read: "${text}".`;
}

export async function choosePayment(page: Page, name: string) {
  await paymentSection(page).getByText(name, { exact: true }).click();
  await page.waitForLoadState("networkidle");
}

/**
 * The order summary as the desktop sidebar reads it. The sidebar is in the
 * page at every width, hidden below 1024 pixels, so its text is read either way.
 */
export async function totalsShown(page: Page) {
  const text = await page.locator("div.lg\\:col-start-3").evaluate((element) =>
    Array.from(element.querySelectorAll("*"))
      .filter((child) => child.children.length === 0)
      .map((child) => child.textContent?.trim())
      .filter(Boolean)
      .join(" "),
  );
  return `The order summary read: "${text}".`;
}

/**
 * Opens the order summary below 1024 pixels, where it is folded away under the
 * header, so the codes and totals it holds are on screen.
 */
export async function showSummary(page: Page) {
  const toggle = page.getByRole("button", { name: "Show order summary" });
  if (await toggle.isVisible()) await toggle.click();
}

/** Enters a code in the order summary's one field for gift cards and coupons. */
export async function applyCode(page: Page, code: string) {
  await showSummary(page);
  await page
    .getByPlaceholder("Gift card or discount code")
    .filter({ visible: true })
    .fill(code);
  await page
    .getByRole("button", { name: "Apply" })
    .filter({ visible: true })
    .click();
  await page.waitForLoadState("networkidle");
}

/**
 * Enters a code and waits until the order summary lists it as applied. A gift
 * card another run holds is refused, and the capture must not pass on that.
 * Spree lists a coupon's code in lower case, so the match ignores case.
 */
export async function applyAcceptedCode(page: Page, code: string) {
  await applyCode(page, code);
  await expect(codeField(page).locator("xpath=../..")).toContainText(
    new RegExp(code, "i"),
    { timeout: 30_000 },
  );
}

/** The order summary's code field that is on screen at this width. */
export const codeField = (page: Page) =>
  page
    .getByRole("textbox", { name: "Gift card or discount code" })
    .filter({ visible: true });

/**
 * Enters a code the store refuses, waits for the field to be marked invalid
 * and returns what it said. Below 1024 pixels the summary on screen is not the
 * sidebar `totalsShown` reads, so its message is read here.
 */
export async function applyRefusedCode(page: Page, code: string) {
  await applyCode(page, code);
  await expect(codeField(page)).toHaveAttribute("aria-invalid", "true", {
    timeout: 30_000,
  });
  const said = await codeField(page)
    .locator("xpath=../..")
    .locator("p")
    .innerText();
  return `The code field said: "${said.trim()}".`;
}

/** Presses a code's remove button and waits until the summary no longer lists it. */
export async function removeCode(page: Page, name: string) {
  const remove = page.getByRole("button", { name }).filter({ visible: true });
  await remove.click();
  await expect(remove).toHaveCount(0, { timeout: 30_000 });
}

/** Ticks the policies, for a guest, and presses "Place Order". */
export async function placeOrder(page: Page, { guest = true } = {}) {
  if (guest) {
    await page.getByRole("checkbox", { name: /I agree/ }).check();
  }
  await page.getByRole("button", { name: "Place Order" }).click();
}

export async function placeOrderAndWait(page: Page, options = { guest: true }) {
  await placeOrder(page, options);
  await page.waitForURL(/\/order-placed\//, {
    timeout: 60_000,
    waitUntil: "commit",
  });
  await expect(page.getByText(/^Order #/)).toBeVisible({ timeout: 30_000 });
  return new URL(page.url()).pathname.split("/").pop() ?? "";
}
