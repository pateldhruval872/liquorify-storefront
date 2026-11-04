import type {
  Address,
  Cart,
  Country,
  CreditCard,
  Customer,
  LineItem,
  PaginatedResponse,
  Product,
} from "@spree/sdk";
import { createTranslator } from "next-intl";
import { getTranslations } from "next-intl/server";
import { mocked } from "storybook/test";
import messages from "../../messages/en.json";
import {
  createAddress,
  deleteAddress,
  getAddresses,
  updateAddress,
} from "../../src/lib/data/addresses";
import {
  addToCart,
  getCart,
  removeCartItem,
  updateCartItem,
} from "../../src/lib/data/cart";
import {
  applyCode,
  getCheckoutOrder,
  removeDiscountCode,
  removeGiftCard,
  selectDeliveryRate,
  updateCartMarket,
  updateOrderAddresses,
} from "../../src/lib/data/checkout";
import { isAuthenticated } from "../../src/lib/data/cookies";
import { getCountry } from "../../src/lib/data/countries";
import {
  deleteCreditCard,
  getCreditCards,
} from "../../src/lib/data/credit-cards";
import { syncSession } from "../../src/lib/data/customer";
import {
  expressCheckoutCreateSession,
  expressCheckoutFinalize,
  expressCheckoutPreparePayment,
  expressCheckoutResolveShipping,
  expressCheckoutSelectRates,
} from "../../src/lib/data/express-checkout-flow";
import { getMarketCountries, resolveMarket } from "../../src/lib/data/markets";
import {
  completeCheckoutOrder,
  completeCheckoutPaymentSession,
  createCheckoutPaymentSession,
  createDirectPayment,
  updateCheckoutPaymentSession,
} from "../../src/lib/data/payment";
import { cachedListProducts, getProducts } from "../../src/lib/data/products";
import { isWholesaleEnabled } from "../../src/lib/spree/config";
import { cart as cartOf } from "../fixtures/cart";
import {
  paymentSession,
  placedOrder,
  unknownCodeError,
  withRateSelected,
} from "../fixtures/checkout";
import { FIXTURE_NOW } from "../fixtures/clock";
import { unitedStates } from "../fixtures/markets";
import { type ProviderNeeds, setProviderNeeds } from "./payment-providers";

/** What a story asks of the replaced server actions, through `parameters.liquorify`. */
export interface ServerActionNeeds {
  /** The cart `getCart` returns; "loading" never resolves. Defaults to no cart. */
  cart?: Awaited<ReturnType<typeof getCart>> | "loading";
  /** The signed-in customer `syncSession` returns; "loading" never resolves. Defaults to a guest. */
  customer?: Customer | null | "loading";
  /** The countries `getCountry` answers with, states included. */
  countries?: Country[];
  /** The products a product list answers with, on the home page and in search; "loading" never resolves. Defaults to none. */
  products?: Product[] | "loading";
  /** Turns the wholesale addon on, as `SPREE_WHOLESALE_CHANNEL` does. */
  wholesale?: boolean;
  /** Makes saving, deleting, removing and adding to the cart fail with this message, as the API's refusal would. */
  failWith?: string;
  /** Leaves saving, deleting, removing and adding to the cart unanswered, to show them in progress. */
  holdWrites?: boolean;
  /**
   * The cart checkout loads, through `getCheckoutOrder`: `null` is a cart
   * Spree does not find, "loading" never answers and "error" fails. Defaults
   * to `cart`.
   */
  checkoutCart?: Cart | null | "loading" | "error";
  /** The signed-in customer's saved addresses. Defaults to none. */
  savedAddresses?: Address[];
  /** Whether the session cookie holds a live sign-in. Defaults to whether there is a customer. */
  signedIn?: boolean;
  /** The countries the market ships to. Defaults to `countries`. */
  marketCountries?: Country[];
  /** The codes Spree accepts and the cart each one answers with; any other code is refused. */
  codes?: Record<string, { cart: Cart; type: "discount" | "gift_card" }>;
  /** The cart a removed coupon or gift card answers with. */
  afterRemovingCode?: Cart;
  /** What a new payment session holds from the provider; "empty" holds nothing. */
  paymentSession?: Record<string, unknown> | "empty";
  /** The signed-in customer's saved cards. Defaults to none. */
  creditCards?: CreditCard[];
  /** What the payment providers' stand-ins answer. */
  providers?: ProviderNeeds;
  /** Makes placing the order fail with this message, after the payment was taken. */
  completionFailsWith?: string;
}

/**
 * Gives the modules replaced in preview.tsx their answers for one story. The
 * real providers run on top of them, so no request reaches a Spree server.
 */
export function mockServerActions(needs: ServerActionNeeds) {
  if (needs.cart === "loading") {
    mocked(getCart).mockReturnValue(new Promise(() => {}));
  } else {
    mocked(getCart).mockResolvedValue(needs.cart ?? null);
  }
  if (needs.customer === "loading") {
    mocked(syncSession).mockReturnValue(new Promise(() => {}));
  } else {
    mocked(syncSession).mockResolvedValue({
      customer: needs.customer ?? null,
      refreshed: false,
      stale: false,
    });
  }

  if (needs.products === "loading") {
    mocked(getProducts).mockReturnValue(new Promise(() => {}));
    mocked(cachedListProducts).mockReturnValue(new Promise(() => {}));
  } else {
    const list = productList(needs.products ?? []);
    mocked(getProducts).mockResolvedValue(list);
    mocked(cachedListProducts).mockResolvedValue(list);
  }
  mocked(isWholesaleEnabled).mockReturnValue(needs.wholesale ?? false);

  // The address editor treats a country it cannot load as one without states.
  mocked(getCountry).mockImplementation(async (iso: string) => {
    const country = needs.countries?.find((entry) => entry.iso === iso);
    if (!country) throw new Error(`No fixture for the country ${iso}`);
    return country;
  });

  // Writes answer as the API would, echoing what was sent, unless the story
  // asks for a refusal or for no answer.
  const refusal = needs.failWith
    ? { success: false as const, error: needs.failWith }
    : null;
  const settle = <T>(result: T): Promise<T> =>
    needs.holdWrites ? new Promise(() => {}) : Promise.resolve(result);
  mocked(createAddress).mockImplementation((params) =>
    settle(
      refusal ?? {
        success: true,
        address: savedAddress("addr_new", params),
      },
    ),
  );
  mocked(updateAddress).mockImplementation((id, params) =>
    settle(refusal ?? { success: true, address: savedAddress(id, params) }),
  );
  mocked(deleteAddress).mockImplementation(() =>
    settle(refusal ?? { success: true }),
  );
  mocked(deleteCreditCard).mockImplementation(() =>
    settle(refusal ?? { success: true }),
  );
  const cart = needs.cart === "loading" ? null : needs.cart;
  mocked(addToCart).mockImplementation(() =>
    settle(
      refusal ??
        (cart
          ? { success: true, cart }
          : { success: false, error: "The story has no cart" }),
    ),
  );
  mocked(updateCartMarket).mockImplementation((_id, params) =>
    settle(
      refusal ??
        (cart
          ? { success: true, cart: { ...cart, ...params } }
          : { success: false, error: "The story has no cart" }),
    ),
  );

  // The cart drawer and cart page change quantities through the cart.
  mocked(updateCartItem).mockImplementation((lineItemId, quantity) =>
    settle(
      refusal ??
        (cart
          ? { success: true, cart: withQuantity(cart, lineItemId, quantity) }
          : { success: false, error: "The story has no cart" }),
    ),
  );
  mocked(removeCartItem).mockImplementation((lineItemId) =>
    settle(
      refusal ??
        (cart
          ? { success: true, cart: withQuantity(cart, lineItemId, 0) }
          : { success: false, error: "The story has no cart" }),
    ),
  );

  mockCheckout(needs, cart ?? null, refusal, settle);

  // Server components read translations through next-intl/server, which
  // only runs on the server, so it answers from the same English messages.
  mocked(getTranslations).mockImplementation((async (
    options?: string | { namespace?: string },
  ) => {
    const namespace =
      typeof options === "string" ? options : options?.namespace;
    return createTranslator({
      locale: "en",
      messages,
      now: new Date(FIXTURE_NOW),
      timeZone: "UTC",
      namespace: namespace as never,
    });
  }) as unknown as typeof getTranslations);
}

type Refusal = { success: false; error: string } | null;
type Settle = <T>(result: T) => Promise<T>;

/**
 * Checkout's answers: the cart it loads, the customer's addresses and cards,
 * the market's countries, and each write it makes on the way to an order.
 */
function mockCheckout(
  needs: ServerActionNeeds,
  storyCart: Cart | null,
  refusal: Refusal,
  settle: Settle,
) {
  const checkoutCart =
    needs.checkoutCart === undefined ? storyCart : needs.checkoutCart;
  if (checkoutCart === "loading") {
    mocked(getCheckoutOrder).mockReturnValue(new Promise(() => {}));
  } else if (checkoutCart === "error") {
    mocked(getCheckoutOrder).mockRejectedValue(
      new Error("The Store API did not answer"),
    );
  } else {
    mocked(getCheckoutOrder).mockResolvedValue(checkoutCart);
  }
  const loaded = typeof checkoutCart === "object" ? checkoutCart : null;
  const noCart = { success: false as const, error: "The story has no cart" };

  mocked(getAddresses).mockResolvedValue({
    data: needs.savedAddresses ?? [],
  } as Awaited<ReturnType<typeof getAddresses>>);
  mocked(isAuthenticated).mockResolvedValue(
    needs.signedIn ?? Boolean(needs.customer && needs.customer !== "loading"),
  );
  mocked(resolveMarket).mockResolvedValue(unitedStates);
  mocked(getMarketCountries).mockResolvedValue({
    data: needs.marketCountries ?? needs.countries ?? [],
  } as Awaited<ReturnType<typeof getMarketCountries>>);
  mocked(getCreditCards).mockResolvedValue({ data: needs.creditCards ?? [] });
  setProviderNeeds(needs.providers);

  mocked(updateOrderAddresses).mockImplementation(() =>
    settle(refusal ?? (loaded ? { success: true, cart: loaded } : noCart)),
  );
  mocked(selectDeliveryRate).mockImplementation((_id, fulfillmentId, rateId) =>
    settle(
      refusal ??
        (loaded
          ? {
              success: true,
              cart: withRateSelected(loaded, fulfillmentId, rateId),
            }
          : noCart),
    ),
  );
  mocked(applyCode).mockImplementation((_id, code) => {
    const accepted = needs.codes?.[code.trim().toUpperCase()];
    return settle(
      accepted
        ? { success: true as const, ...accepted }
        : { success: false as const, error: unknownCodeError },
    ) as ReturnType<typeof applyCode>;
  });
  const afterRemoving = needs.afterRemovingCode ?? loaded;
  mocked(removeDiscountCode).mockImplementation(() =>
    settle(
      refusal ??
        (afterRemoving ? { success: true, cart: afterRemoving } : noCart),
    ),
  );
  mocked(removeGiftCard).mockImplementation(() =>
    settle(
      refusal ??
        (afterRemoving ? { success: true, cart: afterRemoving } : noCart),
    ),
  );

  const session = (paymentMethodId: string) => {
    const method = loaded?.payment_methods.find(
      (entry) => entry.id === paymentMethodId,
    );
    if (!method) return { success: false as const, error: "No such method" };
    const externalData =
      needs.paymentSession === "empty" ? {} : (needs.paymentSession ?? {});
    return {
      success: true as const,
      session: paymentSession(method, externalData),
    };
  };
  mocked(createCheckoutPaymentSession).mockImplementation((_id, methodId) =>
    settle(refusal ?? session(methodId)),
  );
  mocked(updateCheckoutPaymentSession).mockImplementation(() =>
    settle(refusal ?? session(loaded?.payment_methods[0]?.id ?? "")),
  );
  mocked(completeCheckoutPaymentSession).mockImplementation((_id, sessionId) =>
    settle(
      refusal ?? {
        success: true,
        session: {
          ...paymentSession(
            loaded?.payment_methods[0] ??
              placedOrder.payments[0].payment_method,
            {},
          ),
          id: sessionId,
          status: "completed",
        },
      },
    ),
  );
  mocked(createDirectPayment).mockImplementation(() =>
    settle(refusal ?? { success: true, payment: placedOrder.payments[0] }),
  );
  mocked(completeCheckoutOrder).mockImplementation(() =>
    settle(
      needs.completionFailsWith
        ? { success: false as const, error: needs.completionFailsWith }
        : { success: true as const, order: placedOrder },
    ),
  );

  // The express checkout buttons answer from the same cart.
  mocked(expressCheckoutResolveShipping).mockImplementation(() =>
    settle(refusal ?? (loaded ? { success: true, cart: loaded } : noCart)),
  );
  mocked(expressCheckoutSelectRates).mockImplementation(() =>
    settle(refusal ?? (loaded ? { success: true, cart: loaded } : noCart)),
  );
  mocked(expressCheckoutPreparePayment).mockImplementation(() =>
    settle(refusal ?? (loaded ? { success: true, cart: loaded } : noCart)),
  );
  mocked(expressCheckoutCreateSession).mockImplementation((_id, methodId) =>
    settle(refusal ?? session(methodId)),
  );
  mocked(expressCheckoutFinalize).mockImplementation(() =>
    settle(refusal ?? { success: true, order: placedOrder }),
  );
}

/** The cart with one item's quantity changed, or the item gone at zero, totals recomputed. */
function withQuantity(
  current: Cart,
  lineItemId: string,
  quantity: number,
): Cart {
  const items = current.items.flatMap((item): LineItem[] => {
    if (item.id !== lineItemId) return [item];
    if (quantity <= 0) return [];
    const total = (Number(item.price) * quantity).toFixed(2);
    return [
      {
        ...item,
        quantity,
        total,
        display_total: `$${total}`,
        pre_tax_amount: total,
        display_pre_tax_amount: `$${total}`,
        discounted_amount: total,
        display_discounted_amount: `$${total}`,
      },
    ];
  });
  return { ...cartOf(items), id: current.id, number: current.number };
}

function productList(products: Product[]): PaginatedResponse<Product> {
  return {
    data: products,
    meta: {
      page: 1,
      limit: 25,
      count: products.length,
      pages: 1,
      from: products.length > 0 ? 1 : 0,
      to: products.length,
      in: products.length,
      previous: null,
      next: null,
    },
  };
}

function savedAddress(
  id: string,
  params: Parameters<typeof updateAddress>[1],
): Address {
  return {
    id,
    label: null,
    first_name: params.first_name ?? null,
    last_name: params.last_name ?? null,
    full_name: [params.first_name, params.last_name].filter(Boolean).join(" "),
    address1: params.address1 ?? null,
    address2: params.address2 ?? null,
    postal_code: params.postal_code ?? null,
    city: params.city ?? null,
    phone: params.phone ?? null,
    company: params.company ?? null,
    country_name: params.country_code ?? "",
    country_code: params.country_code ?? "US",
    country_iso: params.country_code ?? "US",
    state_text: params.state_code ?? params.state_name ?? null,
    state_code: params.state_code ?? null,
    state_abbr: params.state_code ?? null,
    state_name: params.state_name ?? null,
    quick_checkout: false,
    is_default_billing: false,
    is_default_shipping: false,
  };
}
