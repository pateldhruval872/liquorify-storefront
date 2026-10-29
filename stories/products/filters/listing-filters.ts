import type {
  AvailabilityFilter,
  OptionFilter,
  PriceRangeFilter,
} from "@spree/sdk";
import { createTranslator } from "next-intl";
import messages from "../../../messages/en.json";
import { generatePriceBuckets } from "../../../src/lib/utils/price-buckets";
import { listingFilters } from "../../fixtures/shop";

const filters = listingFilters.filters;

export const colorFilter = filters.find(
  (filter): filter is OptionFilter =>
    filter.type === "option" && filter.name === "color",
) as OptionFilter;
export const sizeFilter = filters.find(
  (filter): filter is OptionFilter =>
    filter.type === "option" && filter.name === "size",
) as OptionFilter;
export const availabilityFilter = filters.find(
  (filter) => filter.type === "availability",
) as AvailabilityFilter;
const priceFilter = filters.find(
  (filter) => filter.type === "price_range",
) as PriceRangeFilter;

const t = createTranslator({ locale: "en", messages, namespace: "products" });

/** The price ranges the filter bar builds from the listing's price range, in English. */
export const priceBuckets = generatePriceBuckets(
  priceFilter.min,
  priceFilter.max,
  priceFilter.currency,
  {
    t: t as (key: string, values?: Record<string, string>) => string,
    locale: "en",
  },
);
