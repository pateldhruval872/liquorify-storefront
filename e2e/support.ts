import { expect, type Locator, type Page } from "@playwright/test";

export const BASE_PATH = "/us/en";
export const PASSWORD = "spree123!";

/**
 * Waits until React has hydrated an element. A click or submit that lands
 * before hydration is lost (a button does nothing) or, for a form, falls back
 * to a native GET submit that reloads the page with the fields in the URL.
 * React tags every hydrated DOM node with a `__reactFiber$…` key.
 */
export async function waitForHydration(locator: Locator): Promise<void> {
  await expect(locator).toBeVisible({ timeout: 30_000 });
  await expect
    .poll(
      () =>
        locator.evaluate((element) =>
          Object.keys(element).some((key) => key.startsWith("__reactFiber")),
        ),
      { timeout: 30_000 },
    )
    .toBe(true);
}

/** The form submitted by the named button (the header holds a search form too). */
export function formWithButton(page: Page, button: string): Locator {
  return page
    .locator("form")
    .filter({ has: page.getByRole("button", { name: button }) });
}

/** The first top-level category in the category navigation. */
async function firstCategory(
  page: Page,
): Promise<{ name: string; href: string }> {
  await page.goto(BASE_PATH);
  const link = page
    .getByRole("navigation", { name: "Category navigation" })
    .getByRole("link")
    .first();
  return {
    name: (await link.textContent())?.trim() ?? "",
    href: (await link.getAttribute("href")) ?? BASE_PATH,
  };
}

/** Opens the first top-level category page and returns its name. */
export async function openFirstCategory(page: Page): Promise<string> {
  const { name, href } = await firstCategory(page);
  await page.goto(href);
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible({
    timeout: 30_000,
  });
  return name;
}

/**
 * Opens a category through the header menu: the first top-level category, or
 * its first subcategory when it has a panel of them. Returns the name of the
 * category opened.
 */
export async function openCategoryFromMenu(page: Page): Promise<string> {
  const { name: topLevel } = await firstCategory(page);
  const menuButton = page.getByRole("button", { name: "Open menu" });
  await waitForHydration(menuButton);
  await menuButton.click();
  const menu = page.getByRole("dialog", { name: "Menu" });
  // Scoped to the menu's list: a category's panel has a back button that
  // carries the category's name too.
  const list = menu.getByRole("navigation").first();
  const categoryButton = list.getByRole("button", {
    name: topLevel,
    exact: true,
  });

  let target = list.getByRole("link", { name: topLevel, exact: true });
  await expect(categoryButton.or(target)).toBeVisible({ timeout: 10_000 });
  if (await categoryButton.count()) {
    // The subcategory panel is the menu list without the "All Products" link.
    // A click landing while the menu is still sliding in is lost.
    const subcategory = menu
      .getByRole("navigation")
      .filter({ hasNot: page.getByRole("link", { name: "All Products" }) })
      .getByRole("link")
      .first();
    await expect(async () => {
      if (!(await subcategory.isVisible())) {
        await categoryButton.click({ timeout: 3_000 });
      }
      await expect(subcategory).toBeVisible({ timeout: 3_000 });
    }).toPass({ timeout: 30_000 });
    target = subcategory;
  }

  const name = (await target.textContent())?.trim() ?? "";
  await target.click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible({
    timeout: 30_000,
  });
  return name;
}

/** Opens the first product listed on a listing page and returns its name. */
export async function openFirstProduct(
  page: Page,
  listingPath: string,
): Promise<string> {
  await page.goto(listingPath);
  const firstProduct = page
    .getByRole("heading", { level: 3 })
    .getByRole("link")
    .first();
  await waitForHydration(firstProduct);
  const name = (await firstProduct.textContent())?.trim() ?? "";
  await firstProduct.click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible({
    timeout: 30_000,
  });
  return name;
}

/**
 * Adds the product on the current product page to the cart and waits for the
 * cart drawer to list it. Returns the drawer.
 */
export async function addToCart(page: Page, name: string): Promise<Locator> {
  const addButton = page.getByRole("button", { name: /add to cart/i });
  await waitForHydration(addButton);
  await expect(addButton).toBeEnabled({ timeout: 10_000 });
  await addButton.click();

  const drawer = page.getByRole("dialog", { name: /^cart/i });
  await expect(drawer.getByRole("link", { name })).toBeVisible({
    timeout: 30_000,
  });
  return drawer;
}

/** Signs a new customer up through the registration form. */
export async function signUp(
  page: Page,
  { firstName = "E2E", lastName = "Customer" } = {},
): Promise<{ email: string; password: string }> {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

  await page.goto(`${BASE_PATH}/account/register`);
  await waitForHydration(formWithButton(page, "Create Account"));
  await page.getByRole("textbox", { name: "First name" }).fill(firstName);
  await page.getByRole("textbox", { name: "Last name" }).fill(lastName);
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill(PASSWORD);
  await page.getByRole("textbox", { name: "Confirm Password" }).fill(PASSWORD);
  await page.getByRole("checkbox", { name: /i agree/i }).check();
  await page.getByRole("button", { name: "Create Account" }).click();

  await expect(
    page.getByRole("heading", { name: "Account Overview" }),
  ).toBeVisible({ timeout: 30_000 });
  return { email, password: PASSWORD };
}

/** Fills the sign-in form on the current page and submits it. */
export async function signIn(
  page: Page,
  email: string,
  password: string,
): Promise<void> {
  await waitForHydration(formWithButton(page, "Sign In"));
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill(password);
  await page.getByRole("button", { name: "Sign In" }).click();
}

/**
 * Saves a United States address in the signed-in customer's address book,
 * starting from an account page, and waits for the book to list it.
 */
export async function addSavedAddress(
  page: Page,
  address1: string,
): Promise<void> {
  await page
    .getByRole("complementary")
    .getByRole("link", { name: "Addresses" })
    .click();
  // The book's button reads differently once it holds an address.
  const add = page.getByRole("button", {
    name: /^(Add Your First Address|Add Address)$/,
  });
  await waitForHydration(add);
  await add.click();

  const dialog = page.getByRole("dialog", { name: "Add New Address" });
  await dialog
    .getByRole("combobox", { name: "Country" })
    .selectOption({ label: "United States" });
  await dialog
    .getByRole("textbox", { name: "Address", exact: true })
    .fill(address1);
  await dialog.getByRole("textbox", { name: "City" }).fill("New York");
  await dialog
    .getByRole("textbox", { name: "ZIP / Postal code" })
    .fill("10001");
  // With the United States selected the state becomes a list, enabled once
  // the country's states have loaded.
  await dialog
    .getByRole("combobox", { name: /state/i })
    .selectOption({ label: "New York" });
  await dialog.getByRole("button", { name: "Save Address" }).click();

  await expect(dialog).toBeHidden({ timeout: 30_000 });
  await expect(page.getByText(address1)).toBeVisible();
}

export interface CheckoutAddress {
  country: string;
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  zip: string;
  phone: string;
  state: string;
}

export const NEW_YORK_ADDRESS: CheckoutAddress = {
  country: "United States",
  firstName: "Test",
  lastName: "Buyer",
  address1: "123 Test St",
  city: "New York",
  zip: "10001",
  phone: "5555550100",
  state: "New York",
};

/** Fills checkout's shipping address form, with a New York address unless told otherwise. */
export async function fillCheckoutAddress(
  page: Page,
  address: CheckoutAddress = NEW_YORK_ADDRESS,
): Promise<void> {
  // The Country dropdown defaults alphabetically (Canada before US) — pick
  // the country explicitly so the rest of the address is valid for it.
  await page.getByLabel(/country/i).selectOption({ label: address.country });

  await page
    .getByLabel(/first name/i)
    .first()
    .fill(address.firstName);
  await page
    .getByLabel(/last name/i)
    .first()
    .fill(address.lastName);
  await page
    .getByLabel(/^address$/i)
    .first()
    .fill(address.address1);
  await page.getByLabel(/city/i).first().fill(address.city);
  await page
    .getByLabel(/zip|postal code/i)
    .first()
    .fill(address.zip);
  await page.getByLabel(/phone/i).first().fill(address.phone);

  // For a country with states the state field is a <select>, disabled while
  // the states list loads. selectOption auto-waits for the control to enable
  // and for the option to be present.
  await page
    .getByLabel(/state|province/i)
    .first()
    .selectOption({ label: address.state });
}

/**
 * Adds a product to the cart from its page, or the first listed product, and
 * returns the cart drawer's checkout link.
 */
export async function checkoutLinkFromCartDrawer(
  page: Page,
  productPath?: string,
): Promise<string> {
  if (productPath) {
    await page.goto(productPath);
  } else {
    await openFirstProduct(page, `${BASE_PATH}/products`);
  }
  const addButton = page.getByRole("button", { name: /add to cart/i });
  await waitForHydration(addButton);
  await expect(addButton).toBeEnabled({ timeout: 10_000 });
  await addButton.click();

  const checkoutLink = page
    .getByRole("dialog", { name: /^cart/i })
    .getByRole("link", { name: /^checkout$/i });
  await expect(checkoutLink).toBeVisible({ timeout: 30_000 });
  const href = await checkoutLink.getAttribute("href");
  if (!href) throw new Error("The cart drawer's checkout link has no address");
  return href;
}

/**
 * Waits for the delivery rates that a saved shipping address brings, keeps
 * the one Spree chose, pays with Check and places the order. A guest agrees
 * to the store's policies first; a customer agreed when registering. Returns
 * the order number the order placed page shows.
 */
export async function placeOrderWithCheck(
  page: Page,
  { guest = false } = {},
): Promise<string> {
  const chosenRate = page
    .locator("#checkout-section-shipping")
    .getByRole("radio", { checked: true });
  await expect(chosenRate).toBeVisible({ timeout: 30_000 });

  const check = page.getByRole("radio", { name: "Check", exact: true });
  await expect(check).toBeVisible({ timeout: 30_000 });
  await check.check();
  await expect(check).toBeChecked();

  return placeOrder(page, { guest });
}

/**
 * Presses "Place Order", after agreeing to the store's policies for a guest,
 * and returns the order number the order placed page shows.
 */
export async function placeOrder(
  page: Page,
  { guest = false } = {},
): Promise<string> {
  if (guest) {
    await page.getByRole("checkbox", { name: /i agree/i }).check();
  }
  await page.getByRole("button", { name: "Place Order" }).click();
  await page.waitForURL(/\/order-placed\//, { timeout: 60_000 });

  const orderLine = page.getByText(/^Order #\S+$/);
  await expect(orderLine).toBeVisible({ timeout: 30_000 });
  return ((await orderLine.textContent()) ?? "").replace("Order #", "").trim();
}

/** Expects the signed-in customer's order history to list the order. */
export async function expectInOrderHistory(
  page: Page,
  orderNumber: string,
): Promise<void> {
  await page.goto(`${BASE_PATH}/account/orders`);
  await expect(
    page.getByRole("heading", { level: 1, name: "Order History" }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(`#${orderNumber}`)).toBeVisible();
}
