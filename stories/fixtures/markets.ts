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

/** A second market with its own currency and three languages, German first. */
export const europe: Market = {
  id: "mkt_4Ke8Vn2d",
  name: "Europe",
  currency: "EUR",
  default_locale: "de",
  tax_inclusive: true,
  default: false,
  country_codes: ["DE", "FR"],
  country_isos: ["DE", "FR"],
  supported_locales: ["de", "en", "fr"],
  countries: [
    {
      iso: "DE",
      iso3: "DEU",
      name: "Germany",
      states_required: false,
      zipcode_required: true,
    },
    {
      iso: "FR",
      iso3: "FRA",
      name: "France",
      states_required: false,
      zipcode_required: true,
    },
  ],
};
