import { type Browser, expect, type Page, test } from "@playwright/test";
import {
  BASE_PATH,
  formWithButton,
  signIn,
  waitForHydration,
} from "../../e2e/support";
import { type OrderState, readAccounts } from "./accounts";
import {
  newPage as newContext,
  open,
  record,
  type Capture as ScreenCapture,
  type Session,
  save,
  widths,
} from "./capture";

/**
 * Captures the running storefront's account screens in each meaningful state
 * and variant a batch maps (LIQ-010 §12.1, step 4). Like `compare.spec.ts`, it
 * gathers evidence for a person to review and passes whenever it can capture a
 * screen; it compares nothing.
 *
 * Start the backend and the storefront as `compare.spec.ts` describes; Storybook
 * is not needed. Set `FIDELITY_ACCOUNTS` to a JSON file kept outside the
 * repository (see `accounts.ts`): a customer with two saved addresses, gift cards
 * and an order in each state, and an order of another customer. The empty
 * states use a customer this run registers.
 *
 * A reset link works once, so the reset's success state is captured only when
 * the file holds `resetToken`, a reset token for the customer, valid for 15
 * minutes. Spree sends it only in an email or a webhook and keeps no copy; a
 * test server that sends neither can make one in its console with
 * `generate_token_for(:password_reset)`. The reset sets the customer's password
 * to the one in the file, so the password stays the same.
 *
 * Where each capture is saved is described in `capture.ts`.
 */

const accounts = readAccounts();

type Variant =
  | "guest"
  | "customer"
  | "new-customer"
  | "another-customers-order";
type Capture = ScreenCapture<Variant>;

const newCustomer = {
  email: `jordan.ellis+${Date.now().toString(36)}@example.com`,
  password: `fidelity-${Math.random().toString(36).slice(2, 12)}`,
};
const sessions: Partial<Record<Variant, Session>> = {};

const heading = (page: Page, name: string) =>
  expect(page.getByRole("heading", { level: 1, name })).toBeVisible({
    timeout: 30_000,
  });

async function fillRegistration(
  page: Page,
  values: { email: string; password: string; confirmation: string },
  consent: boolean,
) {
  await open(page, "/account/register");
  await waitForHydration(formWithButton(page, "Create Account"));
  await page.getByRole("textbox", { name: "First name" }).fill("Jordan");
  await page.getByRole("textbox", { name: "Last name" }).fill("Ellis");
  await page.getByRole("textbox", { name: "Email" }).fill(values.email);
  await page
    .getByRole("textbox", { name: "Password", exact: true })
    .fill(values.password);
  await page
    .getByRole("textbox", { name: "Confirm Password" })
    .fill(values.confirmation);
  if (consent) await page.getByRole("checkbox", { name: /i agree/i }).check();
  await page.getByRole("button", { name: "Create Account" }).click();
}

async function openAddresses(page: Page) {
  await open(page, "/account/addresses");
  await heading(page, "Addresses");
  await waitForHydration(page.getByRole("button", { name: "Add Address" }));
}

/** The address editor for the customer's second address, the studio. */
async function editStudio(page: Page) {
  await openAddresses(page);
  const studio = page
    .locator("div")
    .filter({ hasText: "2200 Mission Street" })
    .filter({ has: page.getByRole("button", { name: "Edit" }) })
    .last();
  await studio.getByRole("button", { name: "Edit" }).click();
  return page.getByRole("dialog", { name: "Edit Address" });
}

async function openProfile(page: Page) {
  await open(page, "/account/profile");
  await heading(page, "Profile");
  await waitForHydration(page.getByRole("button", { name: "Save Changes" }));
}

const invented = "fidelity-invented-token";

const orderCaptures: Capture[] = (
  Object.keys(accounts.orders) as OrderState[]
).map((state) => ({
  screen: "SF-ACC-06",
  state,
  variant: "customer",
  note:
    state === "paid-by-saved-card"
      ? "Found behaviour: the order was paid with a card saved by the test payment gateway, which records no brand, and the page fails."
      : undefined,
  reach: async (page) => {
    await open(page, `/account/orders/${accounts.orders[state]}`);
    await expect(page.getByRole("heading").first()).toBeVisible({
      timeout: 30_000,
    });
  },
}));

const captures: Capture[] = [
  // SF-ACC-01 Sign in and account overview
  {
    screen: "SF-ACC-01",
    state: "sign-in-form",
    variant: "guest",
    reach: async (page) => {
      await open(page, "/account");
      await waitForHydration(formWithButton(page, "Sign In"));
    },
  },
  {
    screen: "SF-ACC-01",
    state: "wrong-password",
    variant: "guest",
    reach: async (page) => {
      await open(page, "/account");
      await signIn(page, accounts.customer.email, "not-the-password");
      await expect(page.getByText("Invalid email or password")).toBeVisible({
        timeout: 30_000,
      });
    },
  },
  {
    screen: "SF-ACC-01",
    state: "sent-to-sign-in",
    variant: "guest",
    reach: async (page) => {
      await open(page, "/account/orders");
      await waitForHydration(formWithButton(page, "Sign In"));
      return `Opened ${BASE_PATH}/account/orders; arrived at ${new URL(page.url()).pathname}${new URL(page.url()).search}`;
    },
  },
  {
    screen: "SF-ACC-01",
    state: "returned",
    variant: "guest",
    reach: async (page) => {
      await open(page, "/account/orders");
      await signIn(page, accounts.customer.email, accounts.customer.password);
      await heading(page, "Order History");
      return "Signed in on the page the orders page sent the guest to, and was brought back to the orders.";
    },
  },
  {
    screen: "SF-ACC-01",
    state: "overview",
    variant: "customer",
    reach: async (page) => {
      await open(page, "/account");
      await expect(
        page.getByRole("heading", { name: "Account Overview" }),
      ).toBeVisible({ timeout: 30_000 });
    },
  },

  // SF-ACC-02 Register
  {
    screen: "SF-ACC-02",
    state: "default",
    variant: "guest",
    reach: async (page) => {
      await open(page, "/account/register");
      await waitForHydration(formWithButton(page, "Create Account"));
    },
  },
  {
    screen: "SF-ACC-02",
    state: "passwords-do-not-match",
    variant: "guest",
    reach: async (page) => {
      await fillRegistration(
        page,
        {
          email: "jordan.ellis@example.com",
          password: "fidelity-pass-1",
          confirmation: "fidelity-pass-2",
        },
        true,
      );
      await expect(page.getByText("Passwords do not match")).toBeVisible();
    },
  },
  {
    screen: "SF-ACC-02",
    state: "password-too-short",
    variant: "guest",
    reach: async (page) => {
      await fillRegistration(
        page,
        {
          email: "jordan.ellis@example.com",
          password: "abc",
          confirmation: "abc",
        },
        true,
      );
      const password = page.getByRole("textbox", {
        name: "Password",
        exact: true,
      });
      const pageMessage = await page
        .getByText("Password must be at least 6 characters")
        .isVisible();
      const browserMessage = await password.evaluate(
        (input) => (input as HTMLInputElement).validationMessage,
      );
      return pageMessage
        ? "The page's own message is shown."
        : `The page's own message is not shown: the browser refused the form first, with its own message "${browserMessage}".`;
    },
  },
  {
    screen: "SF-ACC-02",
    state: "policy-consent-required",
    variant: "guest",
    reach: async (page) => {
      await fillRegistration(
        page,
        {
          email: "jordan.ellis@example.com",
          password: "fidelity-pass-1",
          confirmation: "fidelity-pass-1",
        },
        false,
      );
      await expect(
        page.getByText(
          "You must agree to the store policies to create an account",
        ),
      ).toBeVisible();
    },
  },
  {
    screen: "SF-ACC-02",
    state: "registration-failed",
    variant: "guest",
    reach: async (page) => {
      await fillRegistration(
        page,
        {
          email: accounts.customer.email,
          password: "fidelity-pass-1",
          confirmation: "fidelity-pass-1",
        },
        true,
      );
      const alert = page.getByRole("alert").filter({ hasText: /\w/ });
      await expect(alert.first()).toBeVisible({ timeout: 30_000 });
      return `Registered with an email that already has an account; the page shows "${(await alert.first().innerText()).trim()}".`;
    },
  },

  // SF-ACC-03 Forgot password
  {
    screen: "SF-ACC-03",
    state: "default",
    variant: "guest",
    reach: async (page) => {
      await open(page, "/account/forgot-password");
      await waitForHydration(formWithButton(page, "Send reset link"));
    },
  },
  {
    screen: "SF-ACC-03",
    state: "check-your-email",
    variant: "guest",
    reach: async (page) => {
      await open(page, "/account/forgot-password");
      await waitForHydration(formWithButton(page, "Send reset link"));
      await page
        .getByRole("textbox", { name: "Email" })
        .fill(accounts.customer.email);
      await page.getByRole("button", { name: "Send reset link" }).click();
      await expect(page.getByText("Check your email")).toBeVisible({
        timeout: 30_000,
      });
      return "Requested a reset link for the customer, so Spree issued a reset token.";
    },
  },

  // SF-ACC-04 Reset password
  {
    screen: "SF-ACC-04",
    state: "default",
    variant: "guest",
    reach: async (page) => {
      await open(page, `/account/reset-password?token=${invented}`);
      await waitForHydration(formWithButton(page, "Reset password"));
      return "Opened with an invented token: the form shows for any token until it is submitted.";
    },
  },
  {
    screen: "SF-ACC-04",
    state: "invalid-link",
    variant: "guest",
    reach: async (page) => {
      await open(page, "/account/reset-password");
      await expect(page.getByText("Invalid link")).toBeVisible();
      return "Opened without a token.";
    },
  },
  {
    screen: "SF-ACC-04",
    state: "expired-link",
    variant: "guest",
    reach: async (page) => {
      await open(page, `/account/reset-password?token=${invented}`);
      await waitForHydration(formWithButton(page, "Reset password"));
      await page
        .getByRole("textbox", { name: "New password", exact: true })
        .fill("fidelity-pass-1");
      await page
        .getByRole("textbox", { name: "Confirm new password" })
        .fill("fidelity-pass-1");
      await page.getByRole("button", { name: "Reset password" }).click();
      const alert = page.getByRole("alert").filter({ hasText: /\w/ });
      await expect(alert.first()).toBeVisible({ timeout: 30_000 });
      return `Submitted an invented token; the page shows "${(await alert.first().innerText()).trim()}".`;
    },
  },

  // SF-ACC-05 Orders
  {
    screen: "SF-ACC-05",
    state: "orders-listed",
    variant: "customer",
    reach: async (page) => {
      await open(page, "/account/orders");
      await heading(page, "Order History");
    },
  },
  {
    screen: "SF-ACC-05",
    state: "no-orders",
    variant: "new-customer",
    reach: async (page) => {
      await open(page, "/account/orders");
      await expect(
        page.getByRole("heading", { name: "No orders yet" }),
      ).toBeVisible({ timeout: 30_000 });
    },
  },

  // SF-ACC-06 Order
  ...orderCaptures,
  {
    screen: "SF-ACC-06",
    state: "not-found",
    variant: "another-customers-order",
    reach: async (page) => {
      await open(page, `/account/orders/${accounts.anotherCustomersOrder}`);
      await expect(page.getByText("Order not found").first()).toBeVisible({
        timeout: 30_000,
      });
      return "Signed in as the customer, opened another customer's order by its address.";
    },
  },

  // SF-ACC-07 Addresses
  {
    screen: "SF-ACC-07",
    state: "addresses-listed",
    variant: "customer",
    reach: openAddresses,
  },
  {
    screen: "SF-ACC-07",
    state: "adding",
    variant: "customer",
    window: true,
    reach: async (page) => {
      await openAddresses(page);
      await page.getByRole("button", { name: "Add Address" }).click();
      await expect(
        page.getByRole("dialog", { name: "Add New Address" }),
      ).toBeVisible();
    },
  },
  {
    screen: "SF-ACC-07",
    state: "editing",
    variant: "customer",
    window: true,
    reach: async (page) => {
      const dialog = await editStudio(page);
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("textbox", { name: "Address", exact: true }),
      ).toHaveValue("2200 Mission Street");
    },
  },
  {
    screen: "SF-ACC-07",
    state: "save-refused",
    variant: "customer",
    window: true,
    reach: async (page) => {
      const dialog = await editStudio(page);
      await dialog
        .getByRole("textbox", { name: "ZIP / Postal code" })
        .fill("ABCDE");
      await dialog.getByRole("button", { name: "Save Address" }).click();
      const alert = dialog.getByRole("alert").filter({ hasText: /\w/ });
      await expect(alert.first()).toBeVisible({ timeout: 30_000 });
      return `Changed the studio's ZIP code to "ABCDE" and saved; Spree refused it and the editor shows "${(await alert.first().innerText()).trim()}". Nothing was saved.`;
    },
  },
  {
    screen: "SF-ACC-07",
    state: "delete-confirmation",
    variant: "customer",
    window: true,
    reach: async (page) => {
      await openAddresses(page);
      await page.getByRole("button", { name: "Delete" }).first().click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
    },
  },
  {
    screen: "SF-ACC-07",
    state: "set-as-default",
    variant: "customer",
    unavailable:
      "The storefront has no way to set an address as the default: its messages hold the words, but no component uses them.",
    reach: async () => {},
  },
  {
    screen: "SF-ACC-07",
    state: "no-addresses",
    variant: "new-customer",
    reach: async (page) => {
      await open(page, "/account/addresses");
      await expect(
        page.getByRole("heading", { name: "No saved addresses" }),
      ).toBeVisible({ timeout: 30_000 });
    },
  },

  // SF-ACC-08 Payment methods
  {
    screen: "SF-ACC-08",
    state: "cards-listed",
    variant: "customer",
    note: "Found behaviour: the customer's only card was saved by the test payment gateway, which records no brand, and the page fails. A card with a brand needs a real gateway's test keys.",
    reach: async (page) => {
      await open(page, "/account/credit-cards");
      await expect(page.getByRole("heading").first()).toBeVisible({
        timeout: 30_000,
      });
    },
  },
  {
    screen: "SF-ACC-08",
    state: "remove-confirmation",
    variant: "customer",
    unavailable:
      "The page fails for the customer's only card (see cards-listed), so its remove button cannot be reached.",
    reach: async () => {},
  },
  {
    screen: "SF-ACC-08",
    state: "no-cards",
    variant: "new-customer",
    reach: async (page) => {
      await open(page, "/account/credit-cards");
      await expect(
        page.getByRole("heading", { name: "No payment methods saved" }),
      ).toBeVisible({ timeout: 30_000 });
    },
  },

  // SF-ACC-09 Gift cards
  {
    screen: "SF-ACC-09",
    state: "gift-cards-listed",
    variant: "customer",
    reach: async (page) => {
      await open(page, "/account/gift-cards");
      await heading(page, "Gift Cards");
      return "The customer holds an active, a partly used, a fully redeemed and an expired gift card, so one page shows each of those states.";
    },
  },
  {
    screen: "SF-ACC-09",
    state: "canceled",
    variant: "customer",
    unavailable:
      "Spree can cancel a gift card, but no API offers it, so no canceled gift card can be made without changing Spree's code.",
    reach: async () => {},
  },
  {
    screen: "SF-ACC-09",
    state: "none",
    variant: "new-customer",
    reach: async (page) => {
      await open(page, "/account/gift-cards");
      await expect(
        page.getByRole("heading", { name: "No gift cards" }),
      ).toBeVisible({ timeout: 30_000 });
    },
  },

  // SF-ACC-10 Profile
  {
    screen: "SF-ACC-10",
    state: "default",
    variant: "customer",
    reach: openProfile,
  },
  {
    screen: "SF-ACC-10",
    state: "current-password-needed",
    variant: "customer",
    reach: async (page) => {
      await openProfile(page);
      await page
        .getByRole("textbox", { name: "Email Address" })
        .fill("avery.q@example.com");
      await expect(page.getByLabel("Current Password")).toBeVisible();
      return "Changed the email in the form, without saving.";
    },
  },
  {
    screen: "SF-ACC-10",
    state: "current-password-refused",
    variant: "customer",
    reach: async (page) => {
      await openProfile(page);
      await page
        .getByRole("textbox", { name: "Email Address" })
        .fill("avery.q@example.com");
      await page
        .getByRole("textbox", { name: "Current Password" })
        .fill("not-the-password");
      await page.getByRole("button", { name: "Save Changes" }).click();
      const help = page.locator("#current_password_help");
      await expect(help).toHaveClass(/text-red-600/, { timeout: 30_000 });
      return `Changed the email and gave a wrong current password; Spree refused it and the page shows "${(await help.innerText()).trim()}". Nothing was saved.`;
    },
  },
  {
    screen: "SF-ACC-10",
    state: "updated",
    variant: "customer",
    reach: async (page) => {
      await openProfile(page);
      await page.getByRole("button", { name: "Save Changes" }).click();
      await expect(page.getByText("Profile updated successfully!")).toBeVisible(
        { timeout: 30_000 },
      );
      return "Saved the profile without changing it.";
    },
  },
];

/** The reset's success state: a reset link works once, so both widths come from one visit. */
const resetSuccess: Capture = {
  screen: "SF-ACC-04",
  state: "success",
  variant: "guest",
  unavailable: accounts.resetToken
    ? undefined
    : "Needs a reset token for the customer (resetToken in FIDELITY_ACCOUNTS).",
  reach: async (page) => {
    await open(page, `/account/reset-password?token=${accounts.resetToken}`);
    await waitForHydration(formWithButton(page, "Reset password"));
    await page
      .getByRole("textbox", { name: "New password", exact: true })
      .fill(accounts.customer.password);
    await page
      .getByRole("textbox", { name: "Confirm new password" })
      .fill(accounts.customer.password);
    await page.getByRole("button", { name: "Reset password" }).click();
    await expect(page.getByText("Password reset successful")).toBeVisible({
      timeout: 30_000,
    });
    return "Used a reset token for the customer, setting the same password again. A reset link works once, so the page was captured at 390 pixels and then widened to 1280 without reloading.";
  },
};

const sessionOf = (variant: Variant): Variant | null =>
  variant === "guest"
    ? null
    : variant === "another-customers-order"
      ? "customer"
      : variant;

function newPage(browser: Browser, width: number, variant: Variant) {
  const session = sessionOf(variant);
  return newContext(browser, width, session ? sessions[session] : undefined);
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ browser }) => {
  const customer = await newPage(browser, widths[1], "guest");
  await open(customer.page, "/account");
  await signIn(
    customer.page,
    accounts.customer.email,
    accounts.customer.password,
  );
  await expect(
    customer.page.getByRole("heading", { name: "Account Overview" }),
  ).toBeVisible({ timeout: 30_000 });
  sessions.customer = await customer.context.storageState();
  await customer.context.close();

  const registered = await newPage(browser, widths[1], "guest");
  await fillRegistration(
    registered.page,
    {
      email: newCustomer.email,
      password: newCustomer.password,
      confirmation: newCustomer.password,
    },
    true,
  );
  await expect(
    registered.page.getByRole("heading", { name: "Account Overview" }),
  ).toBeVisible({ timeout: 30_000 });
  sessions["new-customer"] = await registered.context.storageState();
  await registered.context.close();
});

for (const item of captures) {
  if (item.unavailable) {
    test(`${item.screen} ${item.state} ${item.variant} unavailable`, () =>
      record(item));
    continue;
  }
  for (const width of widths) {
    test(`${item.screen} ${item.state} ${item.variant} ${width}`, async ({
      browser,
    }) => {
      const { context, page } = await newPage(browser, width, item.variant);
      try {
        await save(page, item, width, await item.reach(page));
      } finally {
        await context.close();
      }
    });
  }
}

test(`${resetSuccess.screen} ${resetSuccess.state} ${resetSuccess.variant}`, async ({
  browser,
}) => {
  if (resetSuccess.unavailable) {
    record(resetSuccess);
    return;
  }
  const { context, page } = await newPage(browser, widths[0], "guest");
  try {
    const observed = await resetSuccess.reach(page);
    await save(page, resetSuccess, widths[0], observed);
    await page.setViewportSize({ width: widths[1], height: 844 });
    await save(page, resetSuccess, widths[1], observed);
  } finally {
    await context.close();
  }
});
