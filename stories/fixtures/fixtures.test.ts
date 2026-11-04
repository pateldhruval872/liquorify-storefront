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
  PaymentSessionSchema,
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
import {
  adyenCart,
  adyenMethod,
  appliedGiftCard,
  billingAddress,
  checkoutCountries,
  couponAndGiftCardCart,
  couponCart,
  euroCart,
  giftCardCart,
  guestAddress,
  newCheckoutCart,
  noPaymentMethodsCart,
  paidByGiftCardCart,
  paymentSession,
  paypalCart,
  paypalMethod,
  placedOrder,
  savedStripeCards,
  separateBillingCart,
  storeCreditCart,
  stripeCart,
  stripeMethod,
  taxAddedCart,
  testGatewayCart,
  twoMethodsCart,
  twoShipmentCart,
} from "./checkout";
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
  [
    "checkout carts",
    CartSchema,
    [
      newCheckoutCart,
      twoShipmentCart,
      noPaymentMethodsCart,
      twoMethodsCart,
      testGatewayCart,
      stripeCart,
      adyenCart,
      paypalCart,
      separateBillingCart,
      couponCart,
      giftCardCart,
      couponAndGiftCardCart,
      paidByGiftCardCart,
      storeCreditCart,
      taxAddedCart,
      euroCart,
    ],
  ],
  [
    "payment sessions",
    PaymentSessionSchema,
    [
      paymentSession(stripeMethod, { client_secret: "stand_in_secret" }),
      paymentSession(adyenMethod, { session_data: "stand-in-session-data" }),
      paymentSession(paypalMethod, { id: "STAND-IN-PAYPAL-ORDER" }),
    ],
  ],
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
  [
    "addresses",
    AddressSchema,
    [homeAddress, studioAddress, minimalAddress, guestAddress, billingAddress],
  ],
  [
    "countries",
    CountrySchema,
    [unitedStatesWithStates, unitedKingdom, ...checkoutCountries],
  ],
  ["customers", CustomerSchema, [customer, customerWithoutName]],
  [
    "credit cards",
    CreditCardSchema,
    [visaCard, mastercardCard, amexCard, ...savedStripeCards],
  ],
  [
    "gift cards",
    GiftCardSchema,
    [
      activeGiftCard,
      partiallyUsedGiftCard,
      redeemedGiftCard,
      canceledGiftCard,
      expiredGiftCard,
      appliedGiftCard,
    ],
  ],
  [
    "orders",
    OrderSchema,
    [
      ...accountOrders,
      orderWithoutFulfillments,
      orderWithEveryTotal,
      placedOrder,
    ],
  ],
];

describe("fixtures match the SDK schemas", () => {
  it.each(fixtures)("%s", (_name, schema, records) => {
    for (const record of records) {
      expect(schema.safeParse(record).error?.issues ?? []).toEqual([]);
    }
  });
});
