import {
  type Browser,
  expect,
  type Locator,
  type Page,
  test,
} from "@playwright/test";
import { newPage, save, widths } from "./capture";
import {
  addProduct,
  choosePayment,
  fillGuestCheckout,
  methodsShown,
  placeOrderAndWait,
  products,
  ratesShown,
  spainAddress,
  startCheckout,
  totalsShown,
} from "./checkout-run";
import { capture, dashboard, openSettings, sheet, signIn } from "./dashboard";
import { checkoutValues, market } from "./settings-values";

/**
 * Saves the store's checkout settings through batch 7's dashboard screens, as
 * a merchant does, and then opens checkout on the running storefront to see
 * whether the setting shows there (the storefront cart and checkout batch,
 * §2.4; G-38's checkout part). Each step captures the dashboard once it has
 * saved, at 1280 pixels, and the storefront at 390 and 1280. Every step puts
 * back what it changed, apart from `payments-visible`, which the checkout
 * captures need, and which `payments-back` undoes.
 *
 * Start the storefront and the dashboard as `settings.spec.ts` describes. The
 * storefront reads the cart, its rates and its totals afresh on every visit,
 * so nothing needs restarting between steps. `FIDELITY_CHECKOUT_STEP` names
 * what this run does:
 *
 * - `payments-visible`: Check and the test gateway made visible on the
 *   storefront (DA-SET-12); checkout captured before and after.
 * - `gateway-inactive`: the test gateway switched off, then back on.
 * - `promotion-and-gift-cards`: a promotion with a coupon code and two gift
 *   cards, one for part of an order and one for all of it, which
 *   `checkout-screens.spec.ts` redeems.
 * - `express-condition`: an item total condition on Express (DA-SET-17).
 * - `freight`: Express quoted by the freight rate provider with a markup.
 * - `digital`: the digital profile's method renamed, seen on the sample
 *   handbook's shipment.
 * - `euro-amount` and then `zone-without-spain`, once the `market` step of
 *   `settings.spec.ts` has added Spain in euros and the storefront has been
 *   restarted: a euro amount on International Shipping, then Spain taken out
 *   of the International zone while the euro amount stands. The second step
 *   puts both back.
 * - `tax`: a tax rate added (DA-SET-14), then the United States market's
 *   prices made to include tax (DA-SET-11), each seen on the cart page and at
 *   checkout. `tax-back` deletes the rate if a run stopped before it did.
 * - `capture-manual`: the store's payment capture set to manual (DA-SET-02),
 *   and an order placed with Check by a guest, whose order placed page is
 *   captured.
 * - `payments-back`: Check and the test gateway made staff-only again.
 * - `after-orders`: once `checkout-screens.spec.ts` has placed its orders, the
 *   dashboard's order list, to record that they arrived (their screens are
 *   batch 8's), and the gift cards' list with the balance each has left
 *   (FL-17). It changes nothing.
 */

const step = process.env.FIDELITY_CHECKOUT_STEP;

interface Step {
  page: Page;
  store: string;
  browser: Browser;
}

/** A payment method's row in the list opens its sheet. */
async function openPaymentMethod(page: Page, store: string, name: string) {
  await openSettings(page, store, "payment-methods");
  await page
    .getByRole("button", { name: new RegExp(`^${name}( |$)`) })
    .first()
    .click();
  await expect(
    sheet(page).getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue(name, { timeout: 15_000 });
}

async function saveSheet(page: Page) {
  await sheet(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(sheet(page)).toBeHidden({ timeout: 15_000 });
  await page.waitForLoadState("networkidle");
}

async function setSwitch(control: Locator, on: boolean) {
  if ((await control.isChecked()) !== on) await control.click();
}

async function setPaymentMethod(
  page: Page,
  store: string,
  name: string,
  control: "Visible in storefront" | "Active",
  on: boolean,
) {
  await openPaymentMethod(page, store, name);
  await setSwitch(sheet(page).getByRole("switch", { name: control }), on);
  await saveSheet(page);
}

/** Sets the store's "When to charge customers" and saves, unless it is already set. */
async function saveCharge(page: Page, store: string, label: RegExp) {
  await openSettings(page, store, "store");
  const choice = page.getByRole("radio", { name: label });
  if (!(await choice.isChecked())) {
    await choice.click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(
      page.getByText("Store settings updated").first(),
    ).toBeVisible();
  }
  await choice.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
}

const generalProfile = process.env.FIDELITY_GENERAL_PROFILE ?? "fp_UkLWZg9DAJ";

async function openProfile(
  page: Page,
  store: string,
  profile = generalProfile,
) {
  await openSettings(page, store, `delivery-profiles/${profile}`);
}

/** Opens a delivery method's sheet from its button, whose name also carries its conditions. */
async function openDeliveryMethod(
  page: Page,
  store: string,
  name: string,
  profile = generalProfile,
) {
  await openProfile(page, store, profile);
  await page
    .getByRole("button", { name: new RegExp(`^${name}( |$)`) })
    .first()
    .click();
  await expect(
    sheet(page).getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue(name, { timeout: 15_000 });
}

/** The combobox in a sheet field without its own accessible name, found by the field's label. */
const fieldCombobox = (page: Page, label: string) =>
  sheet(page)
    .locator('[data-slot="field"]')
    .filter({ has: page.getByText(label, { exact: true }) })
    .getByRole("combobox");

const zoneCard = (page: Page, name: string) =>
  page.locator('[data-slot="card"]').filter({
    has: page.locator('[data-slot="card-title"]', {
      hasText: new RegExp(`^${name}$`),
    }),
  });

async function openZone(page: Page, store: string, name: string) {
  await openProfile(page, store);
  await zoneCard(page, name)
    .getByRole("button", { name: "Open actions" })
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Edit" }).click();
  await expect(
    sheet(page).getByRole("textbox", { name: "Name", exact: true }),
  ).toHaveValue(name, { timeout: 15_000 });
}

async function setZoneCountry(
  page: Page,
  store: string,
  zone: string,
  country: string,
  member: boolean,
) {
  await openZone(page, store, zone);
  await sheet(page)
    .getByRole("textbox", { name: "Search countries and regions to ship to" })
    .fill(country);
  const checkbox = sheet(page).getByRole("checkbox", {
    name: country,
    exact: true,
  });
  if ((await checkbox.isChecked()) === member) {
    await sheet(page).getByRole("button", { name: "Cancel" }).click();
    return;
  }
  await checkbox.click();
  await saveSheet(page);
}

/**
 * Opens checkout on the storefront as a guest, at 390 pixels and then 1280
 * without reloading, and captures it there with what the shopper was offered.
 */
async function checkAtCheckout(
  browser: Browser,
  screen: string,
  state: string,
  note: string,
  reach: (page: Page) => Promise<string>,
) {
  const { context, page } = await newPage(browser, widths[0]);
  try {
    const observed = await reach(page);
    const item = { screen, state, variant: "guest", note, reach };
    await save(page, item, widths[0], observed);
    await page.setViewportSize({ width: widths[1], height: 844 });
    await save(page, item, widths[1], observed);
  } finally {
    await context.close();
  }
}

/** A guest's checkout in the United States, filled in up to the payment step. */
async function usCheckout(page: Page, items = [products.physical]) {
  await startCheckout(page, { items });
  await fillGuestCheckout(page);
}

const observedCheckout = async (page: Page) =>
  `Rates offered: ${await ratesShown(page)}. ${await methodsShown(page)} ${await totalsShown(page)}`;

const steps: Record<string, (step: Step) => Promise<void>> = {
  "payments-visible": async ({ page, store, browser }) => {
    await openSettings(page, store, "payment-methods");
    await capture(
      page,
      "DA-SET-12",
      "sample-data-methods",
      "Spree's sample data, before anything was saved: Check and the test gateway (named Credit Card) are active but shown to staff only.",
    );
    await checkAtCheckout(
      browser,
      "SF-CHK-01",
      "no-payment-methods",
      "Spree's sample data hides both payment methods from the storefront, so checkout offers none.",
      async (shop) => {
        await usCheckout(shop);
        return observedCheckout(shop);
      },
    );
    for (const name of ["Check", "Credit Card"]) {
      await setPaymentMethod(page, store, name, "Visible in storefront", true);
    }
    await openPaymentMethod(page, store, "Check");
    await capture(
      page,
      "DA-SET-12",
      "check-made-visible",
      'Check and Credit Card (Spree\'s test gateway) each opened from the list, "Visible in storefront" switched on and saved; Check reopened to show the saved switch.',
    );
    await checkAtCheckout(
      browser,
      "SF-CHK-01",
      "payment-methods-offered",
      "After Check and the test gateway were made visible in the dashboard.",
      async (shop) => {
        await usCheckout(shop);
        return observedCheckout(shop);
      },
    );
  },
  "gateway-inactive": async ({ page, store, browser }) => {
    await setPaymentMethod(page, store, "Credit Card", "Active", false);
    await openSettings(page, store, "payment-methods");
    await capture(
      page,
      "DA-SET-12",
      "gateway-inactive",
      'The test gateway (Credit Card) opened from the list, "Active" switched off and saved.',
    );
    await checkAtCheckout(
      browser,
      "SF-CHK-01",
      "gateway-inactive",
      "After the test gateway was made inactive in the dashboard.",
      async (shop) => {
        await usCheckout(shop);
        return methodsShown(shop);
      },
    );
    await setPaymentMethod(page, store, "Credit Card", "Active", true);
  },
  "promotion-and-gift-cards": async ({ page, store }) => {
    const { promotion, giftCards } = checkoutValues;
    await page.goto(`/${store}/promotions`);
    await page.getByRole("button", { name: "New promotion" }).click();
    await expect(
      page.getByRole("heading", { name: "New promotion" }),
    ).toBeVisible({ timeout: 15_000 });
    await page
      .getByRole("textbox", { name: "Name", exact: true })
      .fill(promotion.name);
    await page.getByRole("textbox", { name: "Code" }).fill(promotion.code);
    await page.getByRole("button", { name: "Add action" }).click();
    await page
      .getByRole("button", { name: /^create whole-order adjustment\b/i })
      .click();
    const calculator = page.locator("#calculator-type");
    await expect(calculator).toBeEnabled({ timeout: 10_000 });
    await calculator.click();
    await page.getByRole("option", { name: /^flat rate$/i }).click();
    await sheet(page).locator("#preference-amount").fill(promotion.amount);
    await sheet(page)
      .getByRole("button", { name: /^(save|add)$/i })
      .click();
    await page.getByRole("button", { name: "Create promotion" }).click();
    await expect(
      page.getByRole("heading", { name: promotion.name }),
    ).toBeVisible({ timeout: 15_000 });
    await capture(
      page,
      "DA-PRM-03",
      "coupon-promotion-created",
      `A promotion named "${promotion.name}" with the coupon code ${promotion.code}, taking ${promotion.amount} off the whole order, created on the new promotion page (DA-PRM-02), which then opened the promotion.`,
    );

    for (const card of giftCards) {
      await page.goto(`/${store}/loyalty/gift-cards`);
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "New gift card" }).click();
      await sheet(page).getByRole("textbox", { name: "Code" }).fill(card.code);
      await sheet(page)
        .getByRole("spinbutton", { name: "Amount" })
        .fill(card.amount);
      await sheet(page)
        .getByRole("button", { name: "Create gift card" })
        .click();
      await expect(sheet(page)).toBeHidden({ timeout: 15_000 });
    }
    await page.waitForLoadState("networkidle");
    await capture(
      page,
      "DA-LOY-01",
      "gift-cards-created",
      `Two gift cards issued from the new gift card sheet: ${giftCards.map((card) => `${card.code} for ${card.amount} US dollars`).join(" and ")}.`,
    );
  },
  "express-condition": async ({ page, store, browser }) => {
    const { minimum } = checkoutValues.expressCondition;
    await openDeliveryMethod(page, store, "Express");
    await sheet(page).getByRole("button", { name: "Add condition" }).click();
    await page.getByRole("menuitem", { name: "Item total" }).click();
    await sheet(page)
      .getByRole("spinbutton", { name: "Minimum Amount" })
      .fill(minimum);
    await saveSheet(page);
    await openDeliveryMethod(page, store, "Express");
    await sheet(page)
      .getByRole("button", { name: "Add condition" })
      .evaluate((element) => element.scrollIntoView({ block: "center" }));
    await capture(
      page,
      "DA-SET-17",
      "express-item-total-condition",
      `An item total condition with a minimum of ${minimum} US dollars added to Express and saved; the sheet reopened.`,
    );
    await page.keyboard.press("Escape");
    await checkAtCheckout(
      browser,
      "SF-CHK-01",
      "rate-withheld-by-condition",
      `The cart's items total less than the ${minimum} US dollars Express now needs.`,
      async (shop) => {
        await usCheckout(shop);
        return `Rates offered: ${await ratesShown(shop)}.`;
      },
    );
    await openDeliveryMethod(page, store, "Express");
    await sheet(page).getByRole("button", { name: "Delete" }).click();
    await saveSheet(page);
  },
  freight: async ({ page, store, browser }) => {
    const { markup } = checkoutValues.freight;
    await openDeliveryMethod(page, store, "Express");
    await fieldCombobox(page, "Rate provider").click();
    await page.getByRole("option", { name: /freight/i }).click();
    await sheet(page).locator("#markup_percent").fill(markup);
    await saveSheet(page);
    await openDeliveryMethod(page, store, "Express");
    await capture(
      page,
      "DA-SET-17",
      "express-freight-with-markup",
      `Express given the freight rate provider and a ${markup}% markup, saved; the sheet reopened.`,
    );
    await page.keyboard.press("Escape");
    await checkAtCheckout(
      browser,
      "SF-CHK-01",
      "freight-rate",
      "Express quoted by the freight rate provider, which prices nothing and leaves the price to a forwarder.",
      async (shop) => {
        await usCheckout(shop);
        return `Rates offered: ${await ratesShown(shop)}.`;
      },
    );
    await openDeliveryMethod(page, store, "Express");
    await fieldCombobox(page, "Rate provider").click();
    await page.getByRole("option", { name: /internal/i }).click();
    await saveSheet(page);
  },
  digital: async ({ page, store, browser }) => {
    const { profile, name, renamed } = checkoutValues.digital;
    await openDeliveryMethod(page, store, name, profile);
    await sheet(page)
      .getByRole("textbox", { name: "Name", exact: true })
      .fill(renamed);
    await saveSheet(page);
    await openProfile(page, store, profile);
    await capture(
      page,
      "DA-SET-17",
      "digital-method-renamed",
      `The digital profile's method "${name}" renamed "${renamed}" and saved.`,
    );
    await checkAtCheckout(
      browser,
      "SF-CHK-01",
      "digital-shipment",
      "Spree's sample handbook is digital, so its shipment is offered the digital profile's method.",
      async (shop) => {
        await usCheckout(shop, [products.digital]);
        return `Rates offered: ${await ratesShown(shop)}.`;
      },
    );
    await openDeliveryMethod(page, store, renamed, profile);
    await sheet(page)
      .getByRole("textbox", { name: "Name", exact: true })
      .fill(name);
    await saveSheet(page);
  },
  "euro-amount": async ({ page, store, browser }) => {
    const { method, amount } = checkoutValues.euroAmount;
    const spain = async (shop: Page) => {
      await startCheckout(shop, { base: `/${market.code}/en` });
      await fillGuestCheckout(shop, spainAddress);
      return `Rates offered: ${await ratesShown(shop)}. ${await totalsShown(shop)}`;
    };
    await checkAtCheckout(
      browser,
      "SF-CHK-01",
      "second-market-before-euro-amount",
      `The ${market.name} market in euros, before ${method} had a euro amount.`,
      spain,
    );
    await openDeliveryMethod(page, store, method);
    const field = sheet(page).getByRole("spinbutton", {
      name: "Amount in EUR",
    });
    await field.fill(amount);
    await saveSheet(page);
    await openDeliveryMethod(page, store, method);
    await capture(
      page,
      "DA-SET-17",
      "flat-rate-euro-amount",
      `${method} given ${amount} euros beside its US dollar amount and saved; the sheet reopened.`,
    );
    await page.keyboard.press("Escape");
    await checkAtCheckout(
      browser,
      "SF-CHK-01",
      "second-market-euro-rate",
      `The ${market.name} market in euros, after ${method} was given a euro amount in the dashboard.`,
      spain,
    );
  },
  "zone-without-spain": async ({ page, store, browser }) => {
    await setZoneCountry(page, store, "International", market.country, false);
    await openProfile(page, store);
    await capture(
      page,
      "DA-SET-17",
      "zone-without-a-country",
      `${market.country} unticked in the International zone and saved.`,
    );
    await checkAtCheckout(
      browser,
      "SF-CHK-01",
      "no-delivery-methods-for-country",
      `An address in ${market.country}, which no zone now holds, while International Shipping has a euro amount.`,
      async (shop) => {
        await startCheckout(shop, { base: `/${market.code}/en` });
        await fillGuestCheckout(shop, spainAddress);
        return `Rates offered: ${await ratesShown(shop)}.`;
      },
    );
    await setZoneCountry(page, store, "International", market.country, true);
    const { method } = checkoutValues.euroAmount;
    await openDeliveryMethod(page, store, method);
    await sheet(page)
      .getByRole("spinbutton", { name: "Amount in EUR" })
      .clear();
    await saveSheet(page);
  },
  tax: async ({ page, store, browser }) => {
    const { name, rate } = checkoutValues.taxRate;
    await openSettings(page, store, "taxes");
    await page.getByRole("tab", { name: "Rates" }).click();
    await page.getByRole("button", { name: "Add tax rate" }).click();
    await sheet(page)
      .getByRole("textbox", { name: "Name", exact: true })
      .fill(name);
    await sheet(page).getByRole("spinbutton", { name: "Rate" }).fill(rate);
    await sheet(page).getByRole("combobox", { name: "Tax category" }).click();
    await page.getByRole("option", { name: /^Default/ }).click();
    await sheet(page).getByRole("combobox", { name: "Country" }).click();
    await page
      .getByRole("option", { name: /^United States/ })
      .first()
      .click();
    await sheet(page).getByRole("button", { name: "Create tax rate" }).click();
    await expect(sheet(page)).toBeHidden({ timeout: 15_000 });
    await capture(
      page,
      "DA-SET-14",
      "tax-rate-added",
      `A ${rate}% rate named "${name}" for the Default tax category in the United States, created from the rates tab.`,
    );
    const cartPage = async (shop: Page) => {
      await addProduct(shop, products.physical);
      await shop.goto("/us/en/cart");
      await shop.waitForLoadState("networkidle");
      const text = (await shop.locator("main").innerText())
        .replace(/\s+/g, " ")
        .trim();
      return `The cart page read: "${text}".`;
    };
    const checkout = async (shop: Page) => {
      await usCheckout(shop);
      return totalsShown(shop);
    };
    for (const [screen, reach] of [
      ["SF-SHOP-05", cartPage],
      ["SF-CHK-01", checkout],
    ] as const) {
      await checkAtCheckout(
        browser,
        screen,
        "tax-added",
        `With the ${rate}% rate and the United States market's prices not including tax.`,
        reach,
      );
    }

    await openSettings(page, store, "markets");
    await page
      .getByRole("button", { name: /^United States/ })
      .first()
      .click();
    await setSwitch(
      sheet(page).getByRole("switch", { name: "Prices include tax" }),
      true,
    );
    await sheet(page)
      .getByRole("switch", { name: "Prices include tax" })
      .evaluate((element) => element.scrollIntoView({ block: "center" }));
    await capture(
      page,
      "DA-SET-11",
      "prices-include-tax",
      'The United States market opened from the markets list with "Prices include tax" switched on, before saving. Spree 6.0 sets whether prices include tax on the market, not on the tax rate.',
    );
    await saveSheet(page);
    for (const [screen, reach] of [
      ["SF-SHOP-05", cartPage],
      ["SF-CHK-01", checkout],
    ] as const) {
      await checkAtCheckout(
        browser,
        screen,
        "tax-included",
        `With the ${rate}% rate and the United States market's prices including tax.`,
        reach,
      );
    }

    await openSettings(page, store, "markets");
    await page
      .getByRole("button", { name: /^United States/ })
      .first()
      .click();
    await setSwitch(
      sheet(page).getByRole("switch", { name: "Prices include tax" }),
      false,
    );
    await saveSheet(page);
    await openSettings(page, store, "taxes");
    await page.getByRole("tab", { name: "Rates" }).click();
    await page
      .getByRole("row")
      .filter({ hasText: name })
      .getByRole("button", { name: "Open actions" })
      .click();
    await page.getByRole("menuitem", { name: /delete/i }).click();
    await page
      .getByRole("dialog", { name: "Delete tax rate?" })
      .getByRole("button", { name: "Delete" })
      .click();
    await expect(page.getByRole("row").filter({ hasText: name })).toHaveCount(
      0,
      { timeout: 15_000 },
    );
  },
  "tax-back": async ({ page, store }) => {
    const { name } = checkoutValues.taxRate;
    await openSettings(page, store, "taxes");
    await page.getByRole("tab", { name: "Rates" }).click();
    const rows = page.getByRole("row").filter({ hasText: name });
    for (let left = await rows.count(); left > 0; left--) {
      await rows.first().getByRole("button", { name: "Open actions" }).click();
      await page.getByRole("menuitem", { name: /delete/i }).click();
      await page
        .getByRole("dialog", { name: "Delete tax rate?" })
        .getByRole("button", { name: "Delete" })
        .click();
      await expect(rows).toHaveCount(left - 1, { timeout: 15_000 });
    }
  },
  "capture-manual": async ({ page, store, browser }) => {
    await saveCharge(page, store, /^Manually/);
    // Put back even when a step fails: an order placed while the setting is
    // left at Manually keeps its Check payment pending.
    try {
      await capture(
        page,
        "DA-SET-02",
        "payment-capture-manual",
        'The store\'s "When to charge customers" set to Manually and saved.',
      );
      // A guest places the order: a signed-in customer's cart reaches checkout
      // without an email, which the storefront then locks empty (SD-21).
      await checkAtCheckout(
        browser,
        "SF-CHK-03",
        "check-order-manual-capture",
        "An order a guest placed with Check while the store's payment capture was set to manual. The payment's state is read from the server in the record.",
        async (shop) => {
          await usCheckout(shop);
          await choosePayment(shop, "Check");
          const order = await placeOrderAndWait(shop);
          const payment = (
            await shop
              .getByRole("heading", { name: "Payment", exact: true })
              .locator("xpath=..")
              .innerText()
          )
            .replace(/\s+/g, " ")
            .trim();
          return `The order's address named ${order}. Its payment box read: "${payment}".`;
        },
      );
    } finally {
      await saveCharge(page, store, /^At checkout/);
    }
  },
  "payments-back": async ({ page, store }) => {
    for (const name of ["Check", "Credit Card"]) {
      await setPaymentMethod(page, store, name, "Visible in storefront", false);
    }
    await openSettings(page, store, "payment-methods");
    await capture(
      page,
      "DA-SET-12",
      "methods-put-back",
      'Check and Credit Card put back to staff only: "Visible in storefront" switched off and saved for each.',
    );
  },
  "after-orders": async ({ page, store }) => {
    await page.goto(`/${store}/orders`);
    await page.waitForLoadState("networkidle");
    await capture(
      page,
      "DA-ORD-01",
      "storefront-orders-arrived",
      "The order list after the storefront's orders were placed, opened once to record that they arrived; the order screens are batch 8's.",
    );
    await page.goto(`/${store}/loyalty/gift-cards`);
    await page.waitForLoadState("networkidle");
    await capture(
      page,
      "DA-LOY-01",
      "balances-after-orders",
      `The gift cards' list after ${checkoutValues.giftCards.map((card) => card.code).join(" and ")} were redeemed at checkout (FL-17).`,
    );
  },
};

test.use({ baseURL: dashboard, viewport: { width: 1280, height: 960 } });

test(`checkout setting ${step}`, async ({ page, browser }) => {
  const run = step ? steps[step] : undefined;
  if (!run)
    throw new Error(
      `Set FIDELITY_CHECKOUT_STEP to one of: ${Object.keys(steps).join(", ")}`,
    );
  await run({ page, store: await signIn(page), browser });
});
