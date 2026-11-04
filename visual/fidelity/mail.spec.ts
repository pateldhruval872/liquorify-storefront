import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BASE_PATH,
  formWithButton,
  signIn,
  signUp,
  waitForHydration,
} from "../../e2e/support";
import { widths } from "./capture";
import {
  choosePayment,
  fillGuestCheckout,
  guestEmail,
  placeOrderAndWait,
  startCheckout,
} from "./checkout-run";

/**
 * The platform batch's mail check (P1) for FL-09's password reset: the
 * storefront's own reset email (EM-SF-04), sent when Spree's
 * `customer.password_reset_requested` webhook reaches it, read where the
 * storefront writes it, and its link followed in the browser. The cart and
 * checkout batch adds FL-05's order confirmation (EM-SF-01), sent on Spree's
 * `order.placed` webhook for a guest's order placed with Check, and captures
 * it at both widths in `results/emails/`.
 *
 * Start Spree's browser-test server with
 * `SPREE_WEBHOOKS_ALLOWED_INTERNAL_HOSTS=localhost`, Spree's own setting for
 * delivering webhooks to an internal address, and give it a webhook endpoint
 * for `customer.password_reset_requested` and `order.placed` at
 * `http://localhost:3001/api/webhooks/spree`. The order needs the checkout
 * settings `checkout-screens.spec.ts` names. Then start the built storefront
 * on port 3001 with that endpoint's secret as `SPREE_WEBHOOK_SECRET` and no
 * `RESEND_API_KEY`, so it writes each email to `.next/emails/` under its working
 * folder rather than sending it. Set `STOREFRONT_EMAILS_DIR` to that folder.
 * To leave servers already running alone, start these on other ports and set
 * `FIDELITY_STOREFRONT` to the storefront's address and the endpoint to match.
 */

const STOREFRONT = process.env.FIDELITY_STOREFRONT ?? "http://localhost:3001";
const EMAILS = process.env.STOREFRONT_EMAILS_DIR ?? "";

test.use({ baseURL: STOREFRONT });

const emailFiles = (): string[] => {
  try {
    return readdirSync(EMAILS).filter((name) => name.endsWith(".html"));
  } catch {
    return [];
  }
};

test("FL-09: the reset email arrives through Spree's webhook and its link sets a new password", async ({
  page,
  browser,
}) => {
  test.skip(!EMAILS, "Set STOREFRONT_EMAILS_DIR (see above)");
  const { email, password } = await signUp(page, {
    firstName: "Mail",
    lastName: "Check",
  });
  const before = new Set(emailFiles());

  const guest = await browser.newContext({ baseURL: STOREFRONT });
  const guestPage = await guest.newPage();
  await guestPage.goto(`${BASE_PATH}/account/forgot-password`);
  await waitForHydration(formWithButton(guestPage, "Send reset link"));
  await guestPage.getByRole("textbox", { name: "Email" }).fill(email);
  await guestPage.getByRole("button", { name: "Send reset link" }).click();
  await expect(guestPage.getByText("Check your email")).toBeVisible({
    timeout: 15_000,
  });

  await expect
    .poll(() => emailFiles().filter((name) => !before.has(name)), {
      timeout: 30_000,
    })
    .toHaveLength(1);
  const [file] = emailFiles().filter((name) => !before.has(name));
  expect(file).toMatch(/password-reset/);
  const html = readFileSync(join(EMAILS, file), "utf8");
  const href = html
    .match(/href="([^"]*\/account\/reset-password\?[^"]*)"/)?.[1]
    ?.replaceAll("&amp;", "&");
  expect(href, "the email's reset link").toBeTruthy();
  const link = new URL(href as string);
  expect(link.origin).toBe(STOREFRONT);

  await guestPage.goto(link.href);
  await waitForHydration(formWithButton(guestPage, "Reset password"));
  await guestPage
    .getByLabel("New password", { exact: true })
    .fill("mail-check-456");
  await guestPage.getByLabel("Confirm new password").fill("mail-check-456");
  await guestPage.getByRole("button", { name: "Reset password" }).click();
  await expect(guestPage.getByText("Password reset successful")).toBeVisible({
    timeout: 15_000,
  });
  await guest.close();

  const signInContext = await browser.newContext({ baseURL: STOREFRONT });
  const signInPage = await signInContext.newPage();
  await signInPage.goto(`${BASE_PATH}/account`);
  await signIn(signInPage, email, password);
  await expect(signInPage.getByText(/invalid email or password/i)).toBeVisible({
    timeout: 15_000,
  });
  await signIn(signInPage, email, "mail-check-456");
  await expect(
    signInPage.getByRole("heading", { name: "Account Overview" }),
  ).toBeVisible({ timeout: 30_000 });
  await signInContext.close();
});

test("FL-05: the order confirmation arrives through Spree's webhook", async ({
  page,
}) => {
  test.skip(!EMAILS, "Set STOREFRONT_EMAILS_DIR (see above)");
  const before = new Set(emailFiles());
  await startCheckout(page);
  await fillGuestCheckout(page);
  await choosePayment(page, "Check");
  await placeOrderAndWait(page);
  const number = (await page.getByText(/^Order #/).innerText()).replace(
    "Order #",
    "",
  );

  await expect
    .poll(() => emailFiles().filter((name) => !before.has(name)), {
      timeout: 30_000,
    })
    .toHaveLength(1);
  const [file] = emailFiles().filter((name) => !before.has(name));
  expect(file).toMatch(new RegExp(`order-confirmation--${number}`, "i"));
  const html = readFileSync(join(EMAILS, file), "utf8");
  expect(html).toContain(number);

  const folder = join(__dirname, "results/emails/");
  mkdirSync(folder, { recursive: true });
  for (const width of widths) {
    await page.setViewportSize({ width, height: 844 });
    await page.setContent(html, { waitUntil: "networkidle" });
    await page.screenshot({
      path: `${folder}EM-SF-01-${width}.png`,
      fullPage: true,
    });
  }
  writeFileSync(
    `${folder}EM-SF-01.json`,
    JSON.stringify(
      { email: "EM-SF-01", file, order: number, to: guestEmail },
      null,
      2,
    ),
  );
});
