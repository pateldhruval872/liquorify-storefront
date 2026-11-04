import { expect, type Locator, type Page } from "@playwright/test";
import { waitForHydration } from "../../e2e/support";
import { open } from "./capture";
import {
  addProduct,
  applyAcceptedCode,
  applyRefusedCode,
  billingAddress,
  cartDrawer,
  choosePayment,
  chooseRate,
  fillAddressForm,
  fillGuestCheckout,
  methodsShown,
  paymentSection,
  placeOrder,
  placeOrderAndWait,
  products,
  ratesShown,
  removeCode,
  savedAddresses,
  showSummary,
  startCheckout,
  totalsShown,
  unitedStatesAddress,
} from "./checkout-run";
import { checkoutValues } from "./settings-values";
import { type Capture, interceptActions, runCaptures, visit } from "./shop-run";

/**
 * Captures the running storefront's cart and checkout screens in each state
 * and variant the cart and checkout batch maps (FB-19 §2.2): the cart drawer,
 * the cart page, checkout, the payment confirmation page, the order placed
 * page and the address editor. Like `shop-screens.spec.ts`, it gathers
 * evidence for a person to review and passes whenever it can capture a
 * screen; it compares nothing.
 *
 * Start the backend and the storefront as `compare.spec.ts` describes, with
 * Spree's sample catalog, a second market for Spain in euros, and the checkout
 * settings `checkout-settings.spec.ts` saves: Check and the test gateway
 * visible on the storefront, the coupon and the two gift cards it creates. The
 * products are named in `checkout-run.ts`. A customer is registered by the run
 * and given two saved addresses through the account's address book. Orders
 * are placed with Check and with a gift card, never with a card. The store
 * credit state grants and applies credit through Spree's APIs: give the
 * backend's address in `FIDELITY_BACKEND`, the storefront's publishable key in
 * `FIDELITY_PUBLISHABLE_KEY`, and an admin's sign-in as `dashboard.ts`
 * describes.
 *
 * Where each capture is saved is described in `capture.ts`.
 */

const { promotion, giftCards } = checkoutValues;
const [partGiftCard, wholeGiftCard] = giftCards;
const unknownCart = "/us/en/checkout/cart_fidelity_unknown";

/** What the page's alerts and toasts said, which a capture shows but cannot quote. */
async function messagesShown(page: Page) {
  const texts = (
    await page
      .locator("[role=alert], [data-sonner-toast]")
      .filter({ visible: true })
      .allInnerTexts()
  )
    .map((text) => text.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return texts.length
    ? `The page said: ${texts.map((text) => `"${text}"`).join(", ")}.`
    : "The page showed no alert or toast.";
}

/** Removes whatever the signed-in customer's cart still holds from an earlier capture. */
async function emptyCart(page: Page) {
  await open(page, "/cart");
  const remove = page.getByRole("button", { name: /^Remove / });
  while (await remove.count()) {
    const before = await remove.count();
    await waitForHydration(remove.first());
    await remove.first().click();
    await expect(remove).toHaveCount(before - 1, { timeout: 30_000 });
  }
}

async function openDrawer(page: Page) {
  const button = page.getByRole("button", { name: "Open cart" });
  await waitForHydration(button);
  await button.click();
  await expect(cartDrawer(page)).toBeVisible();
}

/** Adds the product, closes the drawer the add opened, and opens it again from the header. */
async function reopenDrawer(page: Page) {
  const drawer = await addProduct(page, products.physical);
  await page.keyboard.press("Escape");
  await expect(drawer).toBeHidden();
  await openDrawer(page);
  await page.waitForLoadState("networkidle");
}

/** The first quantity field in a scope: the product page has one of its own behind the drawer. */
const quantity = (scope: Page | Locator) =>
  scope.getByRole("textbox", { name: "Quantity" }).first();

async function openCart(page: Page, base = "/us/en") {
  await page.goto(`${base}/cart`);
  await page.waitForLoadState("networkidle");
  await expect(
    page.getByRole("heading", { name: "Shopping Cart" }),
  ).toBeVisible();
}

const cartTotals = async (page: Page) => {
  const text = await page.locator("dl").last().innerText();
  return `The cart's totals read: "${text.replace(/\s+/g, " ").trim()}".`;
};

/** A guest's checkout in the United States, filled in up to the payment step. */
async function addressedCheckout(page: Page, items = [products.physical]) {
  const cart = await startCheckout(page, { items });
  await fillGuestCheckout(page);
  return cart;
}

const observedCheckout = async (page: Page) =>
  `Rates offered: ${await ratesShown(page)}. ${await methodsShown(page)} ${await totalsShown(page)} ${await messagesShown(page)}`;

/** The order placed page's payment box, as it reads. */
async function paymentShown(page: Page) {
  const text = await page
    .getByRole("heading", { name: "Payment", exact: true })
    .locator("xpath=..")
    .innerText();
  return `The payment box read: "${text.replace(/\s+/g, " ").trim()}".`;
}

const greeting = async (page: Page) =>
  `The page's heading read: "${(await page.getByRole("heading", { level: 1 }).first().innerText()).trim()}".`;

/** Adds the customer's two saved addresses through the account's address book. */
async function addSavedAddresses(page: Page) {
  for (const address of savedAddresses) {
    await open(page, "/account/addresses");
    const add = page.getByRole("button", {
      name: /^(Add Address|Add Your First Address)$/,
    });
    await waitForHydration(add.first());
    await add.first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await fillAddressForm(dialog, address);
    await dialog.getByRole("button", { name: "Save Address" }).click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });
  }
}

/** The customer's checkout, with the saved addresses listed. */
async function customerCheckout(page: Page) {
  await emptyCart(page);
  await startCheckout(page);
  await expect(page.getByText(savedAddresses[0].address).first()).toBeVisible();
}

const storeCredit = "15.00";

/**
 * Grants the signed-in customer store credit as staff would, through the Admin
 * API, and applies it to their cart through the Store API, as a storefront
 * with a control for it would. `FIDELITY_PUBLISHABLE_KEY` is the storefront's
 * own key; the admin signs in as `dashboard.ts` describes.
 */
async function applyStoreCredit(page: Page, cart: string) {
  const backend = process.env.FIDELITY_BACKEND ?? "http://localhost:3000";
  const key = process.env.FIDELITY_PUBLISHABLE_KEY ?? "";
  const jwt = (await page.context().cookies()).find(
    (cookie) => cookie.name === "_spree_jwt",
  )?.value;
  const customer = await page.request.get(
    `${backend}/api/v3/store/customers/me`,
    { headers: { "X-Spree-API-Key": key, Authorization: `Bearer ${jwt}` } },
  );
  const { id } = await customer.json();
  const login = await page.request.post(`${backend}/api/v3/admin/auth/login`, {
    data: {
      email: process.env.FIDELITY_ADMIN_EMAIL,
      password: process.env.FIDELITY_ADMIN_PASSWORD,
    },
  });
  const { token } = await login.json();
  const granted = await page.request.post(
    `${backend}/api/v3/admin/customers/${id}/store_credits`,
    {
      headers: { Authorization: `Bearer ${token}` },
      data: { amount: storeCredit, currency: "USD", memo: "Fidelity check" },
    },
  );
  const applied = await page.request.post(
    `${backend}/api/v3/store/carts/${cart}/store_credits`,
    {
      headers: { "X-Spree-API-Key": key, Authorization: `Bearer ${jwt}` },
      data: { amount: storeCredit },
    },
  );
  expect([granted.status(), applied.status()]).toEqual([201, 200]);
}

const addressEditor = (page: Page) => page.getByRole("dialog");

async function editSavedAddress(page: Page) {
  await customerCheckout(page);
  await page.getByRole("button", { name: "Edit" }).first().click();
  await expect(
    addressEditor(page).getByRole("heading", { name: "Edit Address" }),
  ).toBeVisible();
}

const captures: Capture[] = [
  // SF-OVL-02, the cart drawer.
  {
    screen: "SF-OVL-02",
    state: "opened-with-pointer",
    variant: "guest",
    window: true,
    note: 'Closed after adding the product, then opened with the header\'s "Open cart" button.',
    reach: async (page) => {
      await reopenDrawer(page);
      return null;
    },
  },
  {
    screen: "SF-OVL-02",
    state: "opened-with-pointer",
    variant: "customer",
    window: true,
    note: "A signed-in customer's cart, emptied first and given one product.",
    reach: async (page) => {
      await emptyCart(page);
      await reopenDrawer(page);
      return null;
    },
  },
  {
    screen: "SF-OVL-02",
    state: "opened-with-keyboard",
    variant: "guest",
    window: true,
    note: 'Focus moved to the header\'s "Open cart" button and Enter pressed.',
    reach: async (page) => {
      const drawer = await addProduct(page, products.physical);
      await page.keyboard.press("Escape");
      await expect(drawer).toBeHidden();
      await page.getByRole("button", { name: "Open cart" }).focus();
      await page.keyboard.press("Enter");
      await expect(drawer).toBeVisible();
      await page.waitForLoadState("networkidle");
      return `Focus after opening: ${await page.evaluate(() => {
        const element = document.activeElement;
        return `a ${element?.tagName.toLowerCase()} element named "${element?.getAttribute("aria-label") ?? element?.textContent?.trim() ?? ""}"`;
      })}.`;
    },
  },
  {
    screen: "SF-OVL-02",
    state: "empty",
    variant: "guest",
    window: true,
    reach: async (page) => {
      await open(page, "");
      await openDrawer(page);
      await expect(
        cartDrawer(page).getByText("Your cart is empty"),
      ).toBeVisible();
      return null;
    },
  },
  {
    screen: "SF-OVL-02",
    state: "with-items",
    variant: "guest",
    window: true,
    note: "Two products added from their pages; the drawer opens on each add.",
    reach: async (page) => {
      await addProduct(page, products.physical);
      await page.keyboard.press("Escape");
      await addProduct(page, products.second);
      return null;
    },
  },
  {
    screen: "SF-OVL-02",
    state: "loading",
    variant: "guest",
    window: true,
    note: "With a product in the cart, the home page opened again with the storefront's requests answered eight seconds late, and the drawer opened while it waited for the cart. For a visitor with no cart, the header's cart button responded only once the delayed request had answered, so the drawer opened empty.",
    reach: async (page) => {
      await addProduct(page, products.physical);
      await page.keyboard.press("Escape");
      await interceptActions(page, "delay");
      await page.goto("/us/en");
      await openDrawer(page);
      return null;
    },
  },
  {
    screen: "SF-OVL-02",
    state: "updating",
    variant: "guest",
    window: true,
    note: "The quantity's \"Increase quantity\" pressed with the storefront's request left unanswered.",
    reach: async (page) => {
      const drawer = await addProduct(page, products.physical);
      await interceptActions(page, "hold");
      await drawer.getByRole("button", { name: "Increase quantity" }).click();
      await page.waitForTimeout(1_000);
      return null;
    },
  },
  {
    screen: "SF-OVL-02",
    state: "quantity-changed",
    variant: "guest",
    window: true,
    note: '"Increase quantity" pressed once.',
    reach: async (page) => {
      const drawer = await addProduct(page, products.physical);
      await drawer.getByRole("button", { name: "Increase quantity" }).click();
      await expect(quantity(drawer)).toHaveValue("2", { timeout: 30_000 });
      await page.waitForLoadState("networkidle");
      return null;
    },
  },
  {
    screen: "SF-OVL-02",
    state: "item-removed",
    variant: "guest",
    window: true,
    note: "Two products added, then the first removed with its remove button.",
    reach: async (page) => {
      await addProduct(page, products.physical);
      await page.keyboard.press("Escape");
      const drawer = await addProduct(page, products.second);
      const remove = drawer.getByRole("button", { name: /^Remove / });
      await remove.first().click();
      await expect(remove).toHaveCount(1, { timeout: 30_000 });
      await page.waitForLoadState("networkidle");
      return null;
    },
  },
  {
    screen: "SF-OVL-02",
    state: "add-failed",
    variant: "guest",
    window: true,
    note: "The storefront's request to add the product failed on the way.",
    reach: async (page) => {
      await page.goto(`/us/en/products/${products.physical}`);
      await page.waitForLoadState("networkidle");
      const add = page.getByRole("button", { name: /add to cart/i });
      await waitForHydration(add);
      await interceptActions(page, "fail");
      await add.click();
      await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({
        timeout: 15_000,
      });
      return messagesShown(page);
    },
  },
  {
    screen: "SF-OVL-02",
    state: "update-failed",
    variant: "guest",
    window: true,
    note: "The storefront's request to change the quantity failed on the way.",
    reach: async (page) => {
      const drawer = await addProduct(page, products.physical);
      await interceptActions(page, "fail");
      await drawer.getByRole("button", { name: "Increase quantity" }).click();
      await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({
        timeout: 15_000,
      });
      return messagesShown(page);
    },
  },
  {
    screen: "SF-OVL-02",
    state: "remove-failed",
    variant: "guest",
    window: true,
    note: "The storefront's request to remove the item failed on the way.",
    reach: async (page) => {
      const drawer = await addProduct(page, products.physical);
      await interceptActions(page, "fail");
      await drawer
        .getByRole("button", { name: /^Remove / })
        .first()
        .click();
      await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({
        timeout: 15_000,
      });
      return messagesShown(page);
    },
  },

  // SF-SHOP-05, the cart page.
  {
    screen: "SF-SHOP-05",
    state: "empty",
    variant: "guest",
    reach: async (page) => {
      await page.goto("/us/en/cart");
      await page.waitForLoadState("networkidle");
      return null;
    },
  },
  {
    screen: "SF-SHOP-05",
    state: "with-items",
    variant: "guest",
    reach: async (page) => {
      await addProduct(page, products.physical);
      await page.keyboard.press("Escape");
      await addProduct(page, products.second);
      await openCart(page);
      return cartTotals(page);
    },
  },
  {
    screen: "SF-SHOP-05",
    state: "with-items",
    variant: "customer",
    note: "A signed-in customer's cart, emptied first and given one product.",
    reach: async (page) => {
      await emptyCart(page);
      await addProduct(page, products.physical);
      await openCart(page);
      return cartTotals(page);
    },
  },
  {
    screen: "SF-SHOP-05",
    state: "quantity-changed",
    variant: "guest",
    note: '"Increase quantity" pressed once.',
    reach: async (page) => {
      await addProduct(page, products.physical);
      await openCart(page);
      const increase = page
        .getByRole("button", { name: "Increase quantity" })
        .first();
      await waitForHydration(increase);
      await increase.click();
      await expect(quantity(page)).toHaveValue("2", { timeout: 30_000 });
      await page.waitForLoadState("networkidle");
      return cartTotals(page);
    },
  },
  {
    screen: "SF-SHOP-05",
    state: "item-removed",
    variant: "guest",
    note: "Two products added, then the first removed with its remove button.",
    reach: async (page) => {
      await addProduct(page, products.physical);
      await page.keyboard.press("Escape");
      await addProduct(page, products.second);
      await openCart(page);
      const remove = page.getByRole("button", { name: /^Remove / });
      await waitForHydration(remove.first());
      await remove.first().click();
      await expect(remove).toHaveCount(1, { timeout: 30_000 });
      await page.waitForLoadState("networkidle");
      return cartTotals(page);
    },
  },
  {
    screen: "SF-SHOP-05",
    state: "update-failed",
    variant: "guest",
    note: "The storefront's request to change the quantity failed on the way.",
    reach: async (page) => {
      await addProduct(page, products.physical);
      await openCart(page);
      const increase = page
        .getByRole("button", { name: "Increase quantity" })
        .first();
      await waitForHydration(increase);
      await interceptActions(page, "fail");
      await increase.click();
      await expect(page.locator("[data-sonner-toast]").first()).toBeVisible({
        timeout: 15_000,
      });
      return messagesShown(page);
    },
  },
  {
    screen: "SF-SHOP-05",
    state: "gift-card-applied",
    variant: "guest",
    note: `The ${partGiftCard.amount} gift card ${partGiftCard.code} applied at checkout, then the cart page opened.`,
    reach: async (page) => {
      await addressedCheckout(page);
      await applyAcceptedCode(page, partGiftCard.code);
      await openCart(page);
      return cartTotals(page);
    },
  },
  {
    screen: "SF-SHOP-05",
    state: "store-credit-applied",
    variant: "customer",
    note: `${storeCredit} of store credit granted to the customer through the Admin API and applied to their cart through the Store API, because the storefront has no control for it (FB-19 §2.7).`,
    reach: async (page) => {
      await emptyCart(page);
      const drawer = await addProduct(page, products.physical);
      const href = await drawer
        .getByRole("link", { name: /^checkout$/i })
        .getAttribute("href");
      await applyStoreCredit(page, href?.split("/").pop() ?? "");
      await openCart(page);
      return cartTotals(page);
    },
  },
  {
    screen: "SF-SHOP-05",
    state: "second-market",
    variant: "guest",
    note: "The product added on the Spain market's pages, in euros.",
    reach: async (page) => {
      await addProduct(page, products.physical, "/es/en");
      await openCart(page, "/es/en");
      return cartTotals(page);
    },
  },

  // SF-CHK-01, checkout.
  {
    screen: "SF-CHK-01",
    state: "loading",
    variant: "guest",
    note: "A cart the server could not find, so the page asks for it again from the browser; that request was left unanswered.",
    reach: async (page) => {
      await interceptActions(page, "hold");
      await page.goto(unknownCart);
      await page.waitForTimeout(2_000);
      return null;
    },
  },
  {
    screen: "SF-CHK-01",
    state: "not-found",
    variant: "guest",
    note: "An address naming a cart that does not exist.",
    reach: async (page) => {
      const observed = await visit(page, unknownCart);
      return `${observed} ${await messagesShown(page)}`;
    },
  },
  {
    screen: "SF-CHK-01",
    state: "failed-to-load",
    variant: "guest",
    note: "A cart the server could not find, so the page asks for it again from the browser; that request failed on the way.",
    reach: async (page) => {
      await interceptActions(page, "fail");
      await page.goto(unknownCart);
      await expect(page.getByText(/Failed to load checkout/)).toBeVisible({
        timeout: 15_000,
      });
      return messagesShown(page);
    },
  },
  {
    screen: "SF-CHK-01",
    state: "empty-cart",
    variant: "guest",
    note: "Checkout opened for a cart whose only item was removed on the cart page.",
    reach: async (page) => {
      const drawer = await addProduct(page, products.physical);
      const href = await drawer
        .getByRole("link", { name: /^checkout$/i })
        .getAttribute("href");
      await openCart(page);
      const remove = page.getByRole("button", { name: /^Remove / });
      await waitForHydration(remove.first());
      await remove.first().click();
      await expect(remove).toHaveCount(0, { timeout: 30_000 });
      await page.goto(href ?? unknownCart);
      await page.waitForLoadState("networkidle");
      return null;
    },
  },
  {
    screen: "SF-CHK-01",
    state: "guest-arriving",
    variant: "guest",
    note: "Reached from the cart drawer's Checkout link.",
    reach: async (page) => {
      await startCheckout(page);
      return observedCheckout(page);
    },
  },
  {
    screen: "SF-CHK-01",
    state: "guest-address-entered",
    variant: "guest",
    note: "The guest's email and a United States address entered; checkout saves it when focus leaves the form.",
    reach: async (page) => {
      await addressedCheckout(page);
      return observedCheckout(page);
    },
  },
  {
    screen: "SF-CHK-01",
    state: "customer-saved-address",
    variant: "customer",
    note: "A signed-in customer with two saved addresses, arriving from the cart drawer. The email field is locked empty (SD-21).",
    reach: async (page) => {
      await customerCheckout(page);
      await page.getByRole("heading", { name: "Shipping Method" }).click();
      await page.waitForLoadState("networkidle");
      const email = page.getByRole("textbox").first();
      return `The first text field held "${await email.inputValue()}" and was ${(await email.isDisabled()) ? "disabled" : "enabled"}. Rates offered: ${await ratesShown(page)}. ${await messagesShown(page)}`;
    },
  },
  {
    screen: "SF-CHK-01",
    state: "customer-saved-address-chosen",
    variant: "customer",
    note: "The second saved address chosen, then the shipping heading clicked so checkout tries to save it. The email field is locked empty (SD-21).",
    reach: async (page) => {
      await customerCheckout(page);
      await page.getByText(savedAddresses[1].address).first().click();
      await page.getByRole("heading", { name: "Shipping Method" }).click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(1_000);
      return `Rates offered: ${await ratesShown(page)}. ${await messagesShown(page)}`;
    },
  },
  {
    screen: "SF-CHK-01",
    state: "billing-different",
    variant: "guest",
    note: '"Same as shipping address" unticked and a billing address entered.',
    reach: async (page) => {
      await addressedCheckout(page);
      await chooseRate(page, /Standard/);
      await choosePayment(page, "Check");
      const payment = paymentSection(page);
      await payment.getByText("Same as shipping address").click();
      await fillAddressForm(payment, billingAddress);
      await page.getByRole("heading", { name: "Payment Method" }).click();
      await page.waitForLoadState("networkidle");
      return messagesShown(page);
    },
  },
  {
    screen: "SF-CHK-01",
    state: "two-shipments",
    variant: "guest",
    note: "The digital handbook and a product that ships, so Spree splits the order into two shipments.",
    reach: async (page) => {
      await addressedCheckout(page, [products.digital, products.physical]);
      return observedCheckout(page);
    },
  },
  {
    screen: "SF-CHK-01",
    state: "rate-refused",
    variant: "guest",
    note: "Another rate chosen, and the storefront's request to save it failed on the way.",
    reach: async (page) => {
      await addressedCheckout(page);
      await interceptActions(page, "fail");
      await chooseRate(page, /^Express/);
      await page.waitForTimeout(1_000);
      return messagesShown(page);
    },
  },
  {
    screen: "SF-CHK-01",
    state: "check-chosen",
    variant: "guest",
    reach: async (page) => {
      await addressedCheckout(page);
      await choosePayment(page, "Check");
      return methodsShown(page);
    },
  },
  {
    screen: "SF-CHK-01",
    state: "gateway-unsupported",
    variant: "guest",
    note: "Spree's test gateway (Credit Card) chosen; the storefront has no form for it.",
    reach: async (page) => {
      await addressedCheckout(page);
      await choosePayment(page, "Credit Card");
      return methodsShown(page);
    },
  },
  {
    screen: "SF-CHK-01",
    state: "nothing-to-pay",
    variant: "guest",
    note: `The ${wholeGiftCard.amount} gift card ${wholeGiftCard.code} applied, which covers the whole total.`,
    reach: async (page) => {
      await addressedCheckout(page);
      await applyAcceptedCode(page, wholeGiftCard.code);
      await expect(paymentSection(page)).toContainText("No payment required");
      return observedCheckout(page);
    },
  },
  {
    screen: "SF-CHK-01",
    state: "policy-consent-required",
    variant: "guest",
    note: 'Check chosen and "Place Order" pressed without agreeing to the policies.',
    reach: async (page) => {
      await addressedCheckout(page);
      await choosePayment(page, "Check");
      await placeOrder(page, { guest: false });
      await page.waitForTimeout(1_000);
      return messagesShown(page);
    },
  },
  {
    screen: "SF-CHK-01",
    state: "coupon-applied",
    variant: "guest",
    note: `The coupon ${promotion.code} (${promotion.amount} off the order) entered in the order summary.`,
    reach: async (page) => {
      await addressedCheckout(page);
      await applyAcceptedCode(page, promotion.code);
      return `${await totalsShown(page)} ${await messagesShown(page)}`;
    },
  },
  {
    screen: "SF-CHK-01",
    state: "coupon-refused",
    variant: "guest",
    note: "A code no promotion or gift card has entered; the one field takes both.",
    reach: async (page) => {
      await addressedCheckout(page);
      const said = await applyRefusedCode(page, "NOT-A-CODE");
      return `${await totalsShown(page)} ${said} ${await messagesShown(page)}`;
    },
  },
  {
    screen: "SF-CHK-01",
    state: "coupon-removed",
    variant: "guest",
    note: `The coupon ${promotion.code} applied, then removed with its remove button.`,
    reach: async (page) => {
      await addressedCheckout(page);
      await applyAcceptedCode(page, promotion.code);
      await removeCode(page, `Remove coupon ${promotion.code}`);
      await showSummary(page);
      return `${await totalsShown(page)} ${await messagesShown(page)}`;
    },
  },
  {
    screen: "SF-CHK-01",
    state: "gift-card-applied",
    variant: "guest",
    note: `The ${partGiftCard.amount} gift card ${partGiftCard.code} entered in the order summary; it covers part of the total.`,
    reach: async (page) => {
      await addressedCheckout(page);
      await applyAcceptedCode(page, partGiftCard.code);
      return observedCheckout(page);
    },
  },
  {
    screen: "SF-CHK-01",
    state: "gift-card-refused",
    variant: "guest",
    note: `The dollar gift card ${partGiftCard.code} entered on the Spain market's checkout, in euros.`,
    reach: async (page) => {
      await startCheckout(page, { base: "/es/en" });
      const said = await applyRefusedCode(page, partGiftCard.code);
      return `${await totalsShown(page)} ${said} ${await messagesShown(page)}`;
    },
  },
  {
    screen: "SF-CHK-01",
    state: "gift-card-removed",
    variant: "guest",
    note: `The gift card ${partGiftCard.code} applied, then removed with its remove button.`,
    reach: async (page) => {
      await addressedCheckout(page);
      await applyAcceptedCode(page, partGiftCard.code);
      await removeCode(page, "Remove gift card");
      await showSummary(page);
      return `${await totalsShown(page)} ${await messagesShown(page)}`;
    },
  },
  {
    screen: "SF-CHK-01",
    state: "placing-the-order",
    variant: "guest",
    note: 'Check chosen, the policies agreed to, and "Place Order" pressed with the storefront\'s request left unanswered.',
    reach: async (page) => {
      await addressedCheckout(page);
      await choosePayment(page, "Check");
      await interceptActions(page, "hold");
      await placeOrder(page);
      await page.waitForTimeout(1_000);
      return null;
    },
  },
  {
    screen: "SF-CHK-01",
    state: "order-refused",
    variant: "guest",
    note: 'Check chosen, the policies agreed to, and "Place Order" pressed; the storefront\'s request failed on the way.',
    reach: async (page) => {
      await addressedCheckout(page);
      await choosePayment(page, "Check");
      await interceptActions(page, "fail");
      await placeOrder(page);
      await page.waitForTimeout(2_000);
      return messagesShown(page);
    },
  },
  {
    screen: "SF-CHK-01",
    state: "payment-error-returned",
    variant: "guest",
    note: "Checkout as the payment confirmation page leaves it when the payment could not be confirmed (SF-CHK-02 failed).",
    reach: async (page) => {
      const cart = await addressedCheckout(page);
      await page.goto(
        `/us/en/confirm-payment/${cart}?session=fidelity_unknown`,
      );
      await page.waitForURL(/payment_error=/, { timeout: 30_000 });
      await page.waitForLoadState("networkidle");
      return `Arrived at ${new URL(page.url()).pathname}. ${await messagesShown(page)}`;
    },
  },

  // SF-CHK-02, the payment confirmation page.
  {
    screen: "SF-CHK-02",
    state: "finalizing",
    variant: "guest",
    note: "Opened as a payment provider would return the shopper, with the storefront's request to confirm the payment left unanswered.",
    reach: async (page) => {
      const cart = await addressedCheckout(page);
      await interceptActions(page, "hold");
      await page.goto(
        `/us/en/confirm-payment/${cart}?session=fidelity_unknown`,
      );
      await expect(page.getByText("Confirming your payment...")).toBeVisible();
      return null;
    },
  },

  // SF-CHK-03, the order placed page.
  {
    screen: "SF-CHK-03",
    state: "guest-check-order",
    variant: "guest",
    oneVisit: true,
    note: "A guest's order placed with Check.",
    reach: async (page) => {
      await addressedCheckout(page);
      await choosePayment(page, "Check");
      const order = await placeOrderAndWait(page);
      return `Placed from cart ${order}. ${await greeting(page)} ${await paymentShown(page)}`;
    },
  },
  {
    screen: "SF-CHK-03",
    state: "coupon-order",
    variant: "guest",
    oneVisit: true,
    note: `A guest's order with the coupon ${promotion.code}, placed with Check.`,
    reach: async (page) => {
      await addressedCheckout(page);
      await applyAcceptedCode(page, promotion.code);
      await choosePayment(page, "Check");
      const order = await placeOrderAndWait(page);
      return `Placed from cart ${order}. ${await paymentShown(page)}`;
    },
  },
  {
    screen: "SF-CHK-03",
    state: "gift-card-order",
    variant: "guest",
    oneVisit: true,
    note: `A guest's order paid in full by the gift card ${wholeGiftCard.code}.`,
    reach: async (page) => {
      await addressedCheckout(page);
      await applyAcceptedCode(page, wholeGiftCard.code);
      const order = await placeOrderAndWait(page);
      return `Placed from cart ${order}. ${await paymentShown(page)}`;
    },
  },
  {
    screen: "SF-CHK-03",
    state: "customer-greeted",
    variant: "customer",
    unavailable:
      "A signed-in customer cannot place an order on this storefront: checkout leaves their email empty and locked, so their address is never saved (SD-21).",
    reach: async () => null,
  },
  {
    screen: "SF-CHK-03",
    state: "loading",
    variant: "guest",
    note: "The storefront's request for the order was left unanswered.",
    reach: async (page) => {
      await interceptActions(page, "hold");
      await page.goto("/us/en/order-placed/cart_fidelity_unknown");
      await page.waitForTimeout(2_000);
      return null;
    },
  },
  {
    screen: "SF-CHK-03",
    state: "not-found",
    variant: "guest",
    note: "An address naming an order that does not exist.",
    reach: async (page) => {
      const observed = await visit(
        page,
        "/us/en/order-placed/cart_fidelity_unknown",
      );
      return observed;
    },
  },
  {
    screen: "SF-CHK-03",
    state: "failed-to-load",
    variant: "guest",
    note: "The storefront's request for the order failed on the way.",
    reach: async (page) => {
      await interceptActions(page, "fail");
      await page.goto("/us/en/order-placed/cart_fidelity_unknown");
      await expect(page.getByText("Failed to load order details.")).toBeVisible(
        {
          timeout: 15_000,
        },
      );
      return null;
    },
  },

  // SF-OVL-05, the address editor.
  {
    screen: "SF-OVL-05",
    state: "adding",
    variant: "customer",
    window: true,
    note: 'Opened with "Add Address" in the account\'s address book, and filled in.',
    reach: async (page) => {
      await open(page, "/account/addresses");
      const add = page.getByRole("button", { name: "Add Address" });
      await waitForHydration(add);
      await add.click();
      await fillAddressForm(addressEditor(page), unitedStatesAddress);
      return null;
    },
  },
  {
    screen: "SF-OVL-05",
    state: "editing",
    variant: "customer",
    window: true,
    note: 'Opened with a saved address\'s "Edit" at checkout.',
    reach: async (page) => {
      await editSavedAddress(page);
      return null;
    },
  },
  {
    screen: "SF-OVL-05",
    state: "save-refused",
    variant: "customer",
    window: true,
    note: "Opened with a saved address's \"Edit\" at checkout and saved; the storefront's request failed on the way.",
    reach: async (page) => {
      await editSavedAddress(page);
      await interceptActions(page, "fail");
      await addressEditor(page)
        .getByRole("button", { name: "Save Address" })
        .click();
      await page.waitForTimeout(1_000);
      return messagesShown(page);
    },
  },
];

runCaptures(captures, addSavedAddresses);
