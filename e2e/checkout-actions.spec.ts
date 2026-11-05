import {
  expect,
  type Page,
  type Request,
  type Route,
  test,
} from "@playwright/test";
import {
  addSavedAddress,
  BASE_PATH,
  type CheckoutAddress,
  checkoutLinkFromCartDrawer,
  expectInOrderHistory,
  fillCheckoutAddress,
  placeOrder,
  placeOrderWithCheck,
  signUp,
  waitForHydration,
} from "./support";

/**
 * Checkout's actions, one test each: applying a coupon and a gift card,
 * placing an order with Check and with nothing to pay, choosing a saved
 * address, a signed-in customer's checkout, checkout's address editor, and
 * checkout showing tax and a second market's currency. Each checks what the
 * page shows, then reloads and checks what was saved.
 *
 * The data comes from Spree's sample data and bootstrap-spree.sh: the sample
 * coupon FREESHIP; the gift cards E2E-GIFT-PART, 25 dollars, and
 * E2E-GIFT-WHOLE, enough for any order; the E2E Taxed Mug, 20 dollars, taxed
 * at 8% in the United States; and the E2E Spain market in euros, where
 * International Shipping costs 18 euros. The sample Drip Coffee Maker,
 * 89.99 dollars or 84.99 euros, has no tax, and Standard delivery is 5 dollars.
 *
 * With E2E_SABOTAGE=1 every test is expected to fail: the browser undoes the
 * change the test then looks for, which shows the test notices when it does
 * not happen.
 */

const sabotaged = process.env.E2E_SABOTAGE === "1";

const COFFEE_MAKER = `${BASE_PATH}/products/drip-coffee-maker`;
const TAXED_MUG = `${BASE_PATH}/products/e2e-taxed-mug`;
const SPAIN_PATH = "/es/en";

const SPANISH_ADDRESS: CheckoutAddress = {
  country: "Spain",
  firstName: "Lucia",
  lastName: "Ortega",
  address1: "Calle de Alcala 42",
  city: "Madrid",
  zip: "28014",
  phone: "600000000",
  state: "Madrid",
};

test.describe("checkout actions", () => {
  test.beforeEach(() => {
    test.fail(
      sabotaged,
      "Sabotaged: the change this test looks for is undone in the browser",
    );
  });

  test("a guest applies a coupon", async ({ page }) => {
    await guestCheckout(page, COFFEE_MAKER);
    await expect(summaryRow(page, "Total")).toContainText("$94.99");

    if (sabotaged) await dropActions(page, (body) => body.includes("FREESHIP"));
    await applyCode(page, "FREESHIP");

    // Spree keeps a coupon's code in lower case.
    await expect(appliedCode(page, "freeship")).toContainText("-$5.00", {
      timeout: 30_000,
    });
    await expect(summaryRow(page, "Discount")).toContainText("-$5.00");
    await expect(summaryRow(page, "Total")).toContainText("$89.99");

    await reloadCheckout(page);
    await expect(appliedCode(page, "freeship")).toContainText("-$5.00");
    await expect(summaryRow(page, "Discount")).toContainText("-$5.00");
    await expect(summaryRow(page, "Total")).toContainText("$89.99");
  });

  test("a guest applies a gift card", async ({ page }) => {
    await guestCheckout(page, COFFEE_MAKER);

    if (sabotaged)
      await dropActions(page, (body) => body.includes("E2E-GIFT-PART"));
    await applyCode(page, "E2E-GIFT-PART");

    await expect(appliedCode(page, "Gift card E2E-GIFT-PART")).toContainText(
      "-$25.00",
      { timeout: 30_000 },
    );
    await expect(summaryRow(page, "Gift card")).toContainText("-$25.00");
    await expect(summaryRow(page, "Total")).toContainText("$94.99");
    await expect(summaryRow(page, "Amount due")).toContainText("$69.99");

    await reloadCheckout(page);
    await expect(appliedCode(page, "Gift card E2E-GIFT-PART")).toContainText(
      "-$25.00",
    );
    await expect(summaryRow(page, "Amount due")).toContainText("$69.99");
  });

  test("a guest places an order with Check", async ({ page }) => {
    await guestCheckout(page, COFFEE_MAKER);

    if (sabotaged) await dropActionsFromNowOn(page);
    const orderNumber = await placeOrderWithCheck(page, { guest: true });

    await expectCheckPayment(page, orderNumber, "$94.99");
    await page.reload();
    await expectCheckPayment(page, orderNumber, "$94.99");
  });

  test("a guest places an order with nothing to pay", async ({ page }) => {
    await guestCheckout(page, COFFEE_MAKER);

    if (sabotaged)
      await dropActions(page, (body) => body.includes("E2E-GIFT-WHOLE"));
    await applyCode(page, "E2E-GIFT-WHOLE");

    await expect(summaryRow(page, "Gift card")).toContainText("-$94.99", {
      timeout: 30_000,
    });
    await expect(
      page.getByText("No payment required — your order is fully covered."),
    ).toBeVisible();
    await expect(
      page.getByRole("radio", { name: "Check", exact: true }),
    ).toHaveCount(0);

    const orderNumber = await placeOrder(page, { guest: true });
    await expectGiftCardPayment(page, orderNumber, "$94.99");
    await page.reload();
    await expectGiftCardPayment(page, orderNumber, "$94.99");
  });

  test("a customer chooses another saved address", async ({ page }) => {
    await signUp(page);
    await addSavedAddress(page, "1 Older Saved Street");
    await addSavedAddress(page, "2 Newer Saved Avenue");
    await openCheckout(
      page,
      await checkoutLinkFromCartDrawer(page, COFFEE_MAKER),
    );

    // Checkout opens on the address saved last.
    const older = page.getByRole("radio", { name: /1 Older Saved Street/ });
    const newer = page.getByRole("radio", { name: /2 Newer Saved Avenue/ });
    await expect(newer).toBeChecked({ timeout: 30_000 });
    await expect(chosenRate(page)).toBeVisible({ timeout: 30_000 });
    // Checkout saves the address it opens with; wait for that to settle so
    // only the choice below is sent from here on.
    await page.waitForLoadState("networkidle");

    const choosesAddress = (body: string) =>
      body.includes("shipping_address_id");
    if (sabotaged) await dropActions(page, choosesAddress);
    const saved = actionSettled(page, choosesAddress);
    await older.check();
    await expect(older).toBeChecked();
    await expect(newer).not.toBeChecked();
    await saved;

    await reloadCheckout(page);
    await expect(older).toBeChecked({ timeout: 30_000 });
    await expect(newer).not.toBeChecked();
  });

  test("a signed-in customer completes checkout", async ({ page }) => {
    const { email } = await signUp(page, {
      firstName: "Grace",
      lastName: "Hopper",
    });
    await openCheckout(
      page,
      await checkoutLinkFromCartDrawer(page, COFFEE_MAKER),
    );

    const emailField = page.getByPlaceholder(/email address/i);
    await expect(emailField).toHaveValue(email, { timeout: 30_000 });
    await expect(emailField).toBeDisabled();
    await fillCheckoutAddress(page, {
      country: "United States",
      firstName: "Grace",
      lastName: "Hopper",
      address1: "3 Compiler Court",
      city: "New York",
      zip: "10001",
      phone: "5555550100",
      state: "New York",
    });
    // Moving focus out of the address form saves it.
    await page.getByRole("heading", { name: /shipping method/i }).click();

    if (sabotaged) await dropActionsFromNowOn(page, { afterRate: true });
    const orderNumber = await placeOrderWithCheck(page);

    await expectCustomerOrder(page, orderNumber, email);
    await page.reload();
    await expectCustomerOrder(page, orderNumber, email);
    await expectInOrderHistory(page, orderNumber);
  });

  test("a customer edits a saved address at checkout", async ({ page }) => {
    await signUp(page);
    await addSavedAddress(page, "4 Before Edit Road");
    await openCheckout(
      page,
      await checkoutLinkFromCartDrawer(page, COFFEE_MAKER),
    );
    await expect(
      page.getByRole("radio", { name: /4 Before Edit Road/ }),
    ).toBeChecked({ timeout: 30_000 });

    await page.getByRole("button", { name: "Edit", exact: true }).click();
    const editor = page.getByRole("dialog", { name: "Edit Address" });
    await expect(editor).toBeVisible();
    const street = editor.getByRole("textbox", {
      name: "Address",
      exact: true,
    });
    await expect(street).toHaveValue("4 Before Edit Road");
    await street.fill("5 After Edit Lane");

    if (sabotaged)
      await dropActions(page, (body) => body.includes("5 After Edit Lane"));
    // Once the book has the edited address, checkout sets it on the cart.
    const setOnCart = actionSettled(page, (body) =>
      body.includes("shipping_address_id"),
    );
    await editor.getByRole("button", { name: "Save Address" }).click();

    await expect(editor).toBeHidden({ timeout: 30_000 });
    const edited = page.getByRole("radio", { name: /5 After Edit Lane/ });
    await expect(edited).toBeChecked();
    await setOnCart;
    await expect(page.getByText("4 Before Edit Road")).toHaveCount(0);

    await reloadCheckout(page);
    await expect(edited).toBeChecked({ timeout: 30_000 });
    await expect(page.getByText("4 Before Edit Road")).toHaveCount(0);
  });

  test("checkout shows tax on a taxed product", async ({ page }) => {
    // A sabotaged run buys the coffee maker, which has no tax.
    await guestCheckout(page, sabotaged ? COFFEE_MAKER : TAXED_MUG);

    await expect(summaryRow(page, "Tax")).toContainText("$1.60");
    await expect(summaryRow(page, "Subtotal")).toContainText("$20.00");
    await expect(summaryRow(page, "Shipping")).toContainText("$5.00");
    await expect(summaryRow(page, "Total")).toContainText("$26.60");

    await reloadCheckout(page);
    await expect(summaryRow(page, "Tax")).toContainText("$1.60");
    await expect(summaryRow(page, "Total")).toContainText("$26.60");
  });

  test("checkout shows a second market's currency", async ({ page }) => {
    // A sabotaged run shops in the United States market, in dollars.
    const market = sabotaged ? BASE_PATH : SPAIN_PATH;
    await guestCheckout(
      page,
      `${market}/products/drip-coffee-maker`,
      sabotaged ? undefined : SPANISH_ADDRESS,
    );

    await expect(
      page.locator("#checkout-section-shipping").getByRole("radio", {
        name: /International Shipping €18\.00/,
      }),
    ).toBeChecked();
    await expectEuroTotals(page);

    await reloadCheckout(page);
    await expectEuroTotals(page);
  });
});

/**
 * Goes to checkout as a guest with the product at `productPath` in the cart,
 * and enters an email and a shipping address. Waits for the rate Spree
 * chooses for it.
 */
async function guestCheckout(
  page: Page,
  productPath: string,
  address?: CheckoutAddress,
): Promise<void> {
  await openCheckout(page, await checkoutLinkFromCartDrawer(page, productPath));
  const emailField = page.getByPlaceholder(/email address/i);
  await waitForHydration(emailField);
  await emailField.fill(
    `e2e-guest-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`,
  );
  await fillCheckoutAddress(page, address);
  // Moving focus out of the address form saves it.
  await page.getByRole("heading", { name: /shipping method/i }).click();
  await expect(chosenRate(page)).toBeVisible({ timeout: 30_000 });
  await page.waitForLoadState("networkidle");
}

/** Opens checkout and waits for its one copy of the contact form. */
async function openCheckout(page: Page, href: string): Promise<void> {
  await page.goto(href);
  // The streamed page briefly holds two copies of the form while it hydrates.
  await expect(page.getByPlaceholder(/email address/i)).toHaveCount(1, {
    timeout: 20_000,
  });
}

/** Reloads checkout, which reads the cart afresh from Spree. */
async function reloadCheckout(page: Page): Promise<void> {
  await page.reload();
  await expect(page.getByPlaceholder(/email address/i)).toHaveCount(1, {
    timeout: 20_000,
  });
  await waitForHydration(page.getByPlaceholder(/email address/i));
}

const chosenRate = (page: Page) =>
  page
    .locator("#checkout-section-shipping")
    .getByRole("radio", { checked: true });

/** Enters a code in the order summary's one field for coupons and gift cards. */
async function applyCode(page: Page, code: string): Promise<void> {
  const field = page
    .getByRole("textbox", { name: "Gift card or discount code" })
    .filter({ visible: true });
  await waitForHydration(field);
  await field.fill(code);
  await page
    .getByRole("button", { name: "Apply" })
    .filter({ visible: true })
    .click();
}

/** A code the order summary lists as applied, with its amount beside it. */
const appliedCode = (page: Page, label: string) =>
  page
    .locator("div.rounded-sm")
    .filter({ has: page.getByText(label, { exact: true }) })
    .filter({ visible: true });

/** A row of the order summary's totals, by its label. */
const summaryRow = (page: Page, label: string) =>
  page
    .locator("div.flex.justify-between")
    .filter({ has: page.getByText(label, { exact: true }) })
    .filter({ visible: true });

async function expectEuroTotals(page: Page): Promise<void> {
  await expect(summaryRow(page, "Subtotal")).toContainText("€84.99");
  await expect(summaryRow(page, "Shipping")).toContainText("€18.00");
  await expect(summaryRow(page, "Total")).toContainText("EUR");
  await expect(summaryRow(page, "Total")).toContainText("€102.99");
}

/** The order placed page's payment section. */
const paymentSection = (page: Page) =>
  page.getByRole("heading", { level: 3, name: "Payment" }).locator("xpath=..");

async function expectCheckPayment(
  page: Page,
  orderNumber: string,
  amount: string,
): Promise<void> {
  await expect(page.getByText(`Order #${orderNumber}`)).toBeVisible({
    timeout: 30_000,
  });
  await expect(paymentSection(page)).toContainText("Check");
  await expect(paymentSection(page)).toContainText(amount);
}

async function expectGiftCardPayment(
  page: Page,
  orderNumber: string,
  amount: string,
): Promise<void> {
  await expect(page.getByText(`Order #${orderNumber}`)).toBeVisible({
    timeout: 30_000,
  });
  await expect(paymentSection(page)).toContainText("Gift card");
  await expect(paymentSection(page)).toContainText(`Applied ${amount}`);
  await expect(paymentSection(page)).not.toContainText("Check");
}

async function expectCustomerOrder(
  page: Page,
  orderNumber: string,
  email: string,
): Promise<void> {
  await expect(page.getByText(`Order #${orderNumber}`)).toBeVisible({
    timeout: 30_000,
  });
  await expect(
    page.getByRole("heading", { name: "Thanks for your order, Grace!" }),
  ).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();
}

/** Whether a request is one of the page's server actions with matching arguments. */
const isAction = (request: Request, match: (body: string) => boolean) =>
  request.method() === "POST" &&
  !!request.headers()["next-action"] &&
  match(request.postData() ?? "");

/**
 * Resolves once the next server action whose arguments `match` has answered
 * or failed. Checkout shows a choice before Spree has saved it, so a reload
 * waits for this first. Call it before the action is sent.
 */
function actionSettled(
  page: Page,
  match: (body: string) => boolean,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const done = (request: Request) => {
      if (!isAction(request, match)) return;
      clearTimeout(timer);
      page.off("requestfinished", done);
      page.off("requestfailed", done);
      resolve();
    };
    const timer = setTimeout(() => {
      page.off("requestfinished", done);
      page.off("requestfailed", done);
      reject(new Error("The server action was never sent"));
    }, 30_000);
    page.on("requestfinished", done);
    page.on("requestfailed", done);
  });
}

/**
 * Sabotage: aborts the page's server action requests whose arguments `match`,
 * so the change they carry never reaches Spree.
 */
async function dropActions(
  page: Page,
  match: (body: string) => boolean,
): Promise<void> {
  await page.route("**/*", async (route: Route) => {
    if (isAction(route.request(), match)) {
      await route.abort();
      return;
    }
    await route.fallback();
  });
}

/**
 * Sabotage: aborts every server action request from now on, so the order is
 * never placed. A customer's checkout first waits for the rate its address
 * brings.
 */
async function dropActionsFromNowOn(
  page: Page,
  { afterRate = false } = {},
): Promise<void> {
  if (afterRate) {
    await expect(chosenRate(page)).toBeVisible({ timeout: 30_000 });
    await page.waitForLoadState("networkidle");
  }
  await dropActions(page, () => true);
}
