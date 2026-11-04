/**
 * What `settings.spec.ts` saves through the dashboard, which the storefront
 * captures then look for.
 */

export const market = {
  name: "Spain",
  country: "Spain",
  code: "es",
  currency: "EUR",
};

export const newPolicy = {
  name: "Gift Card Terms",
  slug: "gift-card-terms",
  content: "Gift cards never expire and can be used on any order.",
};

export const privacyContent =
  "We use your details only to deliver your order and never sell them.";

export const shownField = {
  label: "Origin",
  key: "origin",
  value: "Made in Portugal",
};

export const hiddenField = {
  label: "Supplier code",
  key: "supplier_code",
  value: "SUP-4471",
};

/** A sample product renamed in the dashboard, and then given a new address (CAP-05-16). */
export const renamedProduct = {
  id: "prod_PQNMcnNFWw",
  name: "Pedestal Fan 40cm",
  slug: "pedestal-fan",
  newName: "Standing Fan 40cm",
  newSlug: "standing-fan",
};

/**
 * What `checkout-settings.spec.ts` saves for the storefront cart and checkout
 * batch. The codes are invented and say what they are for.
 */
export const checkoutValues = {
  promotion: {
    name: "Fidelity welcome coupon",
    code: "WELCOME10",
    amount: "10.00",
  },
  giftCards: [
    { code: "FIDELITY-PART-25", amount: "25.00" },
    { code: "FIDELITY-WHOLE-500", amount: "500.00" },
  ],
  expressCondition: { minimum: "200.00" },
  freight: { markup: "10" },
  digital: {
    profile: process.env.FIDELITY_DIGITAL_PROFILE ?? "fp_gbHJdmfrXB",
    name: "Digital Delivery",
    renamed: "Instant download",
  },
  euroAmount: { method: "International Shipping", amount: "18.00" },
  taxRate: { name: "Fidelity sales tax", rate: "8" },
  customerAddress: {
    country: "United States",
    firstName: "Jordan",
    lastName: "Ellis",
    address: "55 Water Street",
    city: "Brooklyn",
    state: "New York",
    zip: "11201",
    phone: "718-555-0155",
  },
};
