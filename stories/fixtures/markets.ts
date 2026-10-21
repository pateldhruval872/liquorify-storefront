import type { Market } from "@spree/sdk";

export const unitedStates: Market = {
  id: "mkt_7Rq2Lw9a",
  name: "United States",
  currency: "USD",
  default_locale: "en",
  tax_inclusive: false,
  default: true,
  country_codes: ["US"],
  country_isos: ["US"],
  supported_locales: ["en"],
  countries: [
    {
      iso: "US",
      iso3: "USA",
      name: "United States",
      states_required: true,
      zipcode_required: true,
    },
  ],
};
