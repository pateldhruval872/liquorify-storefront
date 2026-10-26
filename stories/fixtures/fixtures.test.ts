import {
  AddressSchema,
  CartSchema,
  CategorySchema,
  CountrySchema,
  CreditCardSchema,
  CustomerSchema,
  GiftCardSchema,
  MarketSchema,
  OrderSchema,
  ProductFiltersSchema,
  ProductSchema,
} from "@spree/sdk/zod";
import { describe, expect, it } from "vitest";
import {
  accountOrders,
  activeGiftCard,
  amexCard,
  canceledGiftCard,
  customer,
  customerWithoutName,
  expiredGiftCard,
  homeAddress,
  mastercardCard,
  minimalAddress,
  orderWithEveryTotal,
  orderWithoutFulfillments,
  partiallyUsedGiftCard,
  redeemedGiftCard,
  studioAddress,
  unitedKingdom,
  unitedStatesWithStates,
  visaCard,
} from "./account";
import { cartWithItems, emptyCart } from "./cart";
import {
  featuredProducts,
  productWithHiddenPrice,
  rootCategories,
} from "./catalog";
import { europe, unitedStates } from "./markets";
import {
  drinkwareCategory,
  firstPageOfProducts,
  kitchenCategory,
  linenSearchResults,
  listingFilters,
  longCategory,
  mugProduct,
  overshirtOnSale,
  overshirtPriceWithheld,
  overshirtProduct,
  overshirtSoldOutChoice,
  secondPageOfProducts,
  shirtsCategory,
  tablewareCategory,
  tablewareWithoutPicture,
  trayProduct,
} from "./shop";

// A fixture that no longer parses means the API changed and the mock now shows
// something Spree would not (LIQ-010 §7.4).
interface Schema {
  safeParse(value: unknown): { error?: { issues: unknown[] } };
}

const fixtures: [string, Schema, unknown[]][] = [
  ["carts", CartSchema, [cartWithItems, emptyCart]],
  ["markets", MarketSchema, [unitedStates, europe]],
  ["products", ProductSchema, [...featuredProducts, productWithHiddenPrice]],
  [
    "product pages",
    ProductSchema,
    [
      overshirtProduct,
      overshirtOnSale,
      overshirtSoldOutChoice,
      overshirtPriceWithheld,
      mugProduct,
      trayProduct,
      ...firstPageOfProducts,
      ...secondPageOfProducts,
      ...linenSearchResults,
    ],
  ],
  ["product filters", ProductFiltersSchema, [listingFilters]],
  [
    "categories",
    CategorySchema,
    [
      ...rootCategories,
      tablewareCategory,
      tablewareWithoutPicture,
      drinkwareCategory,
      kitchenCategory,
      longCategory,
      shirtsCategory,
    ],
  ],
  ["addresses", AddressSchema, [homeAddress, studioAddress, minimalAddress]],
  ["countries", CountrySchema, [unitedStatesWithStates, unitedKingdom]],
  ["customers", CustomerSchema, [customer, customerWithoutName]],
  ["credit cards", CreditCardSchema, [visaCard, mastercardCard, amexCard]],
  [
    "gift cards",
    GiftCardSchema,
    [
      activeGiftCard,
      partiallyUsedGiftCard,
      redeemedGiftCard,
      canceledGiftCard,
      expiredGiftCard,
    ],
  ],
  [
    "orders",
    OrderSchema,
    [...accountOrders, orderWithoutFulfillments, orderWithEveryTotal],
  ],
];

describe("fixtures match the SDK schemas", () => {
  it.each(fixtures)("%s", (_name, schema, records) => {
    for (const record of records) {
      expect(schema.safeParse(record).error?.issues ?? []).toEqual([]);
    }
  });
});
