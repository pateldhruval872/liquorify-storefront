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
