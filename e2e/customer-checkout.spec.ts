import { expect, test } from "@playwright/test";
import {
  addSavedAddress,
  checkoutLinkFromCartDrawer,
  expectInOrderHistory,
  fillCheckoutAddress,
  placeOrderWithCheck,
  signUp,
  waitForHydration,
} from "./support";

/**
 * A signed-in customer's checkout, from the cart drawer to the order placed
 * page and the account's order history (SD-21).
 *
 * The orders are paid with Spree's Check method, so no payment provider is
 * involved; bootstrap-spree.sh shows it at checkout after the Stripe gateway.
 *
 * A cart made while signed in carries no email. Checkout has to use the
 * account's email, which the browser loads after the page has first rendered.
 */

test.describe("signed-in checkout", () => {
  test("a customer places an order to their saved address", async ({
    page,
  }) => {
    const { email } = await signUp(page, {
      firstName: "Ada",
      lastName: "Lovelace",
    });
    await addSavedAddress(page, "12 Difference Engine Row");

    await page.goto(await checkoutLinkFromCartDrawer(page));

    const emailField = page.getByPlaceholder(/email address/i);
    await expect(emailField).toHaveCount(1, { timeout: 20_000 });
    await expect(emailField).toHaveValue(email, { timeout: 30_000 });
    await expect(emailField).toBeDisabled();
    await expect(
      page.getByRole("radio", { name: /12 Difference Engine Row/ }),
    ).toBeChecked();

    const orderNumber = await placeOrderWithCheck(page);
    await expect(page.getByRole("heading", { name: /Ada/ })).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
    await expectInOrderHistory(page, orderNumber);
  });

  test("a customer places an order when their account loads late", async ({
    page,
  }) => {
    const { email } = await signUp(page, {
      firstName: "Alan",
      lastName: "Turing",
    });
    const checkoutLink = await checkoutLinkFromCartDrawer(page);

    // Hold the session sync that loads the account until checkout is on
    // screen. It is a server action taking no arguments, which Next.js posts
    // with an empty list as the body; the page's other actions carry
    // arguments, and one of them must answer before the page hydrates.
    let releaseAccount = (): void => {};
    const accountReleased = new Promise<void>((resolve) => {
      releaseAccount = resolve;
    });
    let heldActions = 0;
    await page.route("**/checkout/**", async (route) => {
      const request = route.request();
      const isActionWithoutArguments =
        request.method() === "POST" &&
        !!request.headers()["next-action"] &&
        request.postData() === "[]";
      if (!isActionWithoutArguments) {
        await route.fallback();
        return;
      }
      heldActions += 1;
      await accountReleased;
      await route.continue();
    });

    await page.goto(checkoutLink);
    const emailField = page.getByPlaceholder(/email address/i);
    await expect(emailField).toHaveCount(1, { timeout: 20_000 });
    await waitForHydration(emailField);
    await expect
      .poll(() => heldActions, { timeout: 15_000 })
      .toBeGreaterThan(0);
    // The account has not loaded, so the field is open, and the cart, made
    // while signed in, has no email to show in it.
    await expect(emailField).toBeEnabled();
    await expect(emailField).toHaveValue("");

    releaseAccount();

    await expect(emailField).toHaveValue(email, { timeout: 30_000 });
    await expect(emailField).toBeDisabled();

    await fillCheckoutAddress(page);
    // Moving focus out of the address form saves it.
    await page.getByRole("heading", { name: /shipping method/i }).click();

    const orderNumber = await placeOrderWithCheck(page);
    await expect(page.getByText(email)).toBeVisible();
    await expectInOrderHistory(page, orderNumber);
  });
});
