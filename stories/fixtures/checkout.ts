import type {
  Address,
  AppliedPromotion,
  Cart,
  Country,
  CreditCard,
  DeliveryMethod,
  DeliveryRate,
  Fulfillment,
  GiftCard,
  Order,
  PaymentMethod,
  PaymentSession,
  StockLocation,
} from "@spree/sdk";
import {
  checkPayment,
  homeAddress,
  mastercardCard,
  studioAddress,
  unitedKingdom,
  unitedStatesWithStates,
  visaCard,
} from "./account";
import { cart, lineItem } from "./cart";
import { europe, unitedStates } from "./markets";

/**
 * Carts at each point of checkout, shaped like the Store API's answers for
 * `/carts/:id` and its writes, with the delivery rates, payment methods,
 * codes and payment sessions checkout reads. Every name, address, code and
 * amount is invented.
 */

function money(amount: number) {
  return amount.toFixed(2);
}

function dollars(amount: number) {
  return `$${money(amount)}`;
}

/** The countries checkout's address forms offer, as the market's countries answer. */
export const checkoutCountries: Country[] = [
  unitedStatesWithStates,
  unitedKingdom,
];

/** The guest's address, typed into checkout and saved to the cart. */
export const guestAddress: Address = {
  ...homeAddress,
  id: "addr_6Pz3Lc8h",
  first_name: "Jordan",
  last_name: "Ellis",
  full_name: "Jordan Ellis",
  address1: "55 Water Street",
  city: "Brooklyn",
  postal_code: "11201",
  phone: "718-555-0155",
  is_default_billing: false,
  is_default_shipping: false,
};

/** A billing address that differs from the shipping one. */
export const billingAddress: Address = {
  ...studioAddress,
  id: "addr_1Vb7Nw4s",
};

export const savedAddresses: Address[] = [homeAddress, studioAddress];

const items = [
  lineItem({
    id: "li_2Gd7Wq4m",
    variant_id: "variant_8Kc3Np1x",
    name: "Linen Overshirt",
    slug: "linen-overshirt",
    options_text: "Size: M, Color: Sand",
    price: "68.00",
    quantity: 1,
    thumbnail_url: "/fixtures/product-sand.png",
  }),
  lineItem({
    id: "li_6Jt1Zr5s",
    variant_id: "variant_3Vb9Hm2q",
    name: "Canvas Tote Bag",
    slug: "canvas-tote-bag",
    price: "24.00",
    quantity: 2,
  }),
];

function deliveryMethod(
  fields: Pick<DeliveryMethod, "id" | "name"> & Partial<DeliveryMethod>,
): DeliveryMethod {
  return {
    code: null,
    estimated_transit_business_days_min: null,
    estimated_transit_business_days_max: null,
    digital: false,
    pickup: false,
    pickup_point: false,
    ...fields,
  };
}

const standard = deliveryMethod({
  id: "dm_2Yc8Lk5f",
  name: "Standard",
  estimated_transit_business_days_min: 3,
  estimated_transit_business_days_max: 5,
});
/** Spree's sample data offers pickup as a rate of its own, named like any other. */
const storePickup = deliveryMethod({
  id: "dm_4Qw8Zt3n",
  name: "Store Pickup",
  pickup: true,
});
const express = deliveryMethod({
  id: "dm_7Hr4Bn2x",
  name: "Express",
  estimated_transit_business_days_min: 1,
  estimated_transit_business_days_max: 2,
});

function rate(
  id: string,
  method: DeliveryMethod,
  cost: number,
  selected: boolean,
): DeliveryRate {
  return {
    id,
    delivery_method_id: method.id,
    name: method.name,
    selected,
    cost: money(cost),
    total: money(cost),
    additional_tax_total: "0.00",
    included_tax_total: "0.00",
    tax_total: "0.00",
    carrier: null,
    service_level: null,
    estimated_delivery_date: null,
    unpriced: false,
    freight_summary: null,
    display_cost: dollars(cost),
    display_total: dollars(cost),
    display_additional_tax_total: "$0.00",
    display_included_tax_total: "$0.00",
    display_tax_total: "$0.00",
    delivery_method: method,
  };
}

function location(id: string, name: string): StockLocation {
  return {
    id,
    name,
    address1: null,
    city: null,
    zipcode: null,
    country_code: "US",
    country_name: "United States",
    state_code: null,
    state_text: null,
    country_iso: "US",
    state_abbr: null,
    pickup_ready_in_minutes: null,
    pickup_instructions: null,
  };
}

const brooklyn = location("sloc_4Gm1Rz7p", "Brooklyn Warehouse");
const portland = location("sloc_8Tq2Wv6c", "Portland Workshop");

function shipment(
  id: string,
  from: StockLocation,
  rates: DeliveryRate[],
  shipped: { item_id: string; variant_id: string; quantity: number }[],
): Fulfillment {
  const chosen = rates.find((entry) => entry.selected);
  return {
    id,
    number: `cart_8Wd3Kq6n-F${id === "ful_7Vc1Jn5r" ? 2 : 1}`,
    tracking: null,
    tracking_url: null,
    pickup_point_data: null,
    selected_delivery_rate_id: chosen?.id ?? null,
    unpriced: false,
    cost: chosen?.cost ?? "0.00",
    display_cost: chosen?.display_cost ?? "$0.00",
    total: chosen?.cost ?? "0.00",
    display_total: chosen?.display_cost ?? "$0.00",
    discount_total: "0.00",
    display_discount_total: "$0.00",
    additional_tax_total: "0.00",
    display_additional_tax_total: "$0.00",
    included_tax_total: "0.00",
    display_included_tax_total: "$0.00",
    tax_total: "0.00",
    display_tax_total: "$0.00",
    status: "unfulfilled",
    fulfillment_type: "shipping",
    fulfilled_at: null,
    delivered_at: null,
    items: shipped,
    deliveries: [],
    delivery_method: (chosen ?? rates[0]).delivery_method,
    stock_location: from,
    delivery_rates: rates,
  };
}

const everything = items.map((item) => ({
  item_id: item.id,
  variant_id: item.variant_id,
  quantity: item.quantity,
}));

export const oneShipment = shipment(
  "ful_3Kp8Wd2q",
  brooklyn,
  [
    rate("rate_1Ks7Pv4e", storePickup, 0, false),
    rate("rate_5Ng2Lx7c", standard, 5, true),
    rate("rate_9Fw4Hm1z", express, 15, false),
  ],
  everything,
);

export const twoShipments = [
  shipment(
    "ful_3Kp8Wd2q",
    brooklyn,
    [
      rate("rate_5Ng2Lx7c", standard, 5, true),
      rate("rate_9Fw4Hm1z", express, 15, false),
    ],
    everything.slice(0, 1),
  ),
  shipment(
    "ful_7Vc1Jn5r",
    portland,
    [
      rate("rate_2Bt6Qs8d", standard, 5, false),
      rate("rate_6Mh3Ry9w", express, 15, true),
    ],
    everything.slice(1),
  ),
];

function paymentMethod(
  fields: Pick<PaymentMethod, "id" | "name" | "type"> & Partial<PaymentMethod>,
): PaymentMethod {
  return {
    description: null,
    session_required: false,
    source_required: false,
    ...fields,
  };
}

export const checkMethod = paymentMethod({
  id: "pm_9Bf2Tc6r",
  name: "Check",
  type: "check",
  description: "Pay by check.",
});

/** Spree's test gateway, which asks for a payment session. */
export const testGatewayMethod = paymentMethod({
  id: "pm_3Wq7Kd1n",
  name: "Credit Card",
  type: "bogus",
  session_required: true,
  source_required: true,
});

export const stripeMethod = paymentMethod({
  id: "pm_6Dw3Ns9b",
  name: "Credit Card",
  type: "stripe",
  session_required: true,
  source_required: true,
});

export const adyenMethod = paymentMethod({
  id: "pm_4Rj8Xc2v",
  name: "Adyen",
  type: "adyen",
  session_required: true,
  source_required: true,
});

export const paypalMethod = paymentMethod({
  id: "pm_8Lm5Tb3k",
  name: "PayPal",
  type: "paypal_checkout",
  session_required: true,
  source_required: true,
});

/** Totals recomputed from what the cart holds, as Spree answers after each write. */
function withTotals(base: Cart, fields: Partial<Cart>): Cart {
  const next = { ...base, ...fields };
  const itemTotal = Number(next.item_total);
  const delivery = (next.fulfillments ?? []).reduce(
    (sum, entry) => sum + Number(entry.cost ?? 0),
    0,
  );
  const discount = Number(next.discount_total ?? 0);
  const tax = Number(next.additional_tax_total ?? 0);
  const total = itemTotal + delivery + discount + tax;
  const giftCard = Number(next.gift_card_total ?? 0);
  const storeCredit = Number(next.store_credit_total ?? 0);
  const due = total - giftCard - storeCredit;
  return {
    ...next,
    delivery_total: money(delivery),
    display_delivery_total: dollars(delivery),
    total: money(total),
    display_total: dollars(total),
    amount_due: money(due),
    display_amount_due: dollars(due),
  };
}

/** Unmet requirements, as `/carts/:id` lists them, in Spree's own wording. */
export const emailRequirement: Cart["requirements"][number] = {
  code: "email_required",
  step: "address",
  field: "email",
  message: "Email address is required",
};

export const addressRequirement: Cart["requirements"][number] = {
  code: "ship_address_required",
  step: "address",
  field: "ship_address",
  message: "Shipping address is required",
};

export const deliveryRequirement: Cart["requirements"][number] = {
  code: "delivery_method_required",
  step: "delivery",
  field: "shipping_method",
  message: "Select a delivery method for all fulfillments",
};

export const paymentRequirement: Cart["requirements"][number] = {
  code: "payment_required",
  step: "payment",
  field: "payment",
  message: "Add a payment method",
};

/** The cart once the shopper picks a rate for one shipment, as Spree answers. */
export function withRateSelected(
  current: Cart,
  fulfillmentId: string,
  rateId: string,
): Cart {
  return withTotals(current, {
    fulfillments: current.fulfillments.map((entry) => {
      if (entry.id !== fulfillmentId) return entry;
      const rates = entry.delivery_rates.map((option) => ({
        ...option,
        selected: option.id === rateId,
      }));
      const chosen = rates.find((option) => option.selected) ?? rates[0];
      return {
        ...entry,
        delivery_rates: rates,
        selected_delivery_rate_id: chosen.id,
        cost: chosen.cost,
        display_cost: chosen.display_cost,
        total: chosen.cost,
        display_total: chosen.display_cost,
        delivery_method: chosen.delivery_method,
      };
    }),
  });
}

const base = cart(items);

/** A guest's cart on arrival at checkout: nothing entered yet. */
export const newCheckoutCart: Cart = {
  ...base,
  id: "cart_8Wd3Kq6n",
  requirements: [
    emailRequirement,
    addressRequirement,
    deliveryRequirement,
    paymentRequirement,
  ],
};

/** The address saved: one shipment with its rates, and Check offered. */
export const addressedCart: Cart = withTotals(newCheckoutCart, {
  email: "jordan.ellis@example.com",
  shipping_address: guestAddress,
  billing_address: null,
  shipping_eq_billing_address: false,
  fulfillments: [oneShipment],
  payment_methods: [checkMethod],
  current_step: "payment",
  completed_steps: ["address", "delivery"],
  requirements: [paymentRequirement],
});

export const twoShipmentCart: Cart = withTotals(addressedCart, {
  fulfillments: twoShipments,
});

/** The address saved, but the store shows no payment method on its storefront. */
export const noPaymentMethodsCart: Cart = {
  ...addressedCart,
  payment_methods: [],
};

export const twoMethodsCart: Cart = {
  ...addressedCart,
  payment_methods: [testGatewayMethod, checkMethod],
};

export const testGatewayCart: Cart = {
  ...addressedCart,
  payment_methods: [testGatewayMethod],
};

export const stripeCart: Cart = {
  ...addressedCart,
  payment_methods: [stripeMethod, checkMethod],
};

export const adyenCart: Cart = {
  ...addressedCart,
  payment_methods: [adyenMethod],
};

export const paypalCart: Cart = {
  ...addressedCart,
  payment_methods: [paypalMethod],
};

/** Billing to a different address than shipping. */
export const separateBillingCart: Cart = {
  ...addressedCart,
  billing_address: billingAddress,
  shipping_eq_billing_address: false,
};

const welcomeCoupon: AppliedPromotion = {
  id: "promo_5Xr2Kd7m",
  promotion_id: "promo_5Xr2Kd7m",
  name: "Welcome 10% off",
  description: null,
  code: "WELCOME10",
  amount: "-11.60",
  display_amount: "-$11.60",
};

export const couponCart: Cart = withTotals(addressedCart, {
  discounts: [welcomeCoupon],
  coupon_code: "WELCOME10",
  discount_total: "-11.60",
  display_discount_total: "-$11.60",
});

export const appliedGiftCard: GiftCard = {
  id: "gc_7Tn4Wb2q",
  code: "GC4F7K2M9QXD",
  status: "active",
  currency: "USD",
  amount: "50.00",
  amount_used: "0.00",
  amount_authorized: "50.00",
  amount_remaining: "50.00",
  display_amount: "$50.00",
  display_amount_used: "$0.00",
  display_amount_remaining: "$50.00",
  expires_at: null,
  redeemed_at: null,
  expired: false,
  active: true,
};

export const giftCardCart: Cart = withTotals(addressedCart, {
  gift_card: appliedGiftCard,
  gift_card_total: "50.00",
  display_gift_card_total: "$50.00",
});

export const couponAndGiftCardCart: Cart = withTotals(couponCart, {
  gift_card: appliedGiftCard,
  gift_card_total: "50.00",
  display_gift_card_total: "$50.00",
});

/** A gift card worth more than the order: nothing is left to pay. */
export const paidByGiftCardCart: Cart = withTotals(addressedCart, {
  gift_card: {
    ...appliedGiftCard,
    amount: "150.00",
    amount_authorized: "121.00",
    amount_remaining: "150.00",
    display_amount: "$150.00",
    display_amount_remaining: "$150.00",
  },
  gift_card_total: "121.00",
  display_gift_card_total: "$121.00",
});

/** Store credit applied through the Store API; checkout has no control for it. */
export const storeCreditCart: Cart = withTotals(giftCardCart, {
  store_credit_total: "20.00",
  display_store_credit_total: "$20.00",
});

/** A sales tax added to the prices. */
export const taxAddedCart: Cart = withTotals(addressedCart, {
  additional_tax_total: "9.28",
  display_additional_tax_total: "$9.28",
  tax_total: "9.28",
  display_tax_total: "$9.28",
});

/** A market whose prices include tax, in euros. */
export const euroCart: Cart = (() => {
  const euroItems = items.map((item) => ({
    ...item,
    currency: "EUR" as const,
    display_price: `€${item.price}`,
    display_total: `€${item.total}`,
  }));
  const euros = cart(euroItems);
  return withTotals(euros, {
    id: "cart_2Hs9Vn4p",
    currency: "EUR" as const,
    locale: "de",
    market_id: europe.id,
    included_tax_total: "18.52",
    display_included_tax_total: "€18,52",
    tax_total: "18.52",
    display_tax_total: "€18,52",
    email: "jordan.ellis@example.com",
    shipping_address: {
      ...guestAddress,
      address1: "Torstraße 12",
      city: "Berlin",
      postal_code: "10119",
      country_name: "Germany",
      country_code: "DE",
      country_iso: "DE",
      state_text: null,
      state_code: null,
      state_abbr: null,
      state_name: null,
      phone: null,
    },
    fulfillments: [
      {
        ...oneShipment,
        cost: "6.00",
        total: "6.00",
        delivery_rates: oneShipment.delivery_rates.map((option) => {
          const cost = money(Number(option.cost) * 1.2);
          return { ...option, cost, total: cost };
        }),
      },
    ],
    payment_methods: [checkMethod],
  });
})();

/** What the Store API refuses an unknown code with; Spree's own wording. */
export const unknownCodeError =
  "The coupon code you entered doesn't exist. Please try again.";

/** The saved cards checkout offers a signed-in customer for Stripe. */
export const savedStripeCards: CreditCard[] = [
  { ...visaCard, gateway_payment_profile_id: "pm_card_visa_stand_in" },
  { ...mastercardCard, gateway_payment_profile_id: "pm_card_mc_stand_in" },
];

/** A payment session for each provider, with invented values that look like no real key. */
export function paymentSession(
  method: PaymentMethod,
  externalData: Record<string, unknown>,
): PaymentSession {
  return {
    id: "ps_4Nd8Qw2k",
    status: "pending",
    currency: "USD",
    external_id: "stand-in-session",
    external_data: externalData,
    customer_external_id: null,
    expires_at: null,
    amount: addressedCart.total,
    payment_method_id: method.id,
    order_id: null,
    cart_id: addressedCart.id,
    payment_method: method,
  };
}

/** The order placed with Check, as the completion answers. */
export const placedOrder: Order = (() => {
  const { countries: _countries, ...orderMarket } = unitedStates;
  const placed = addressedCart;
  return {
    id: "or_3Qm8Kv5t",
    number: "R100000072",
    market_id: placed.market_id,
    withdrawal_period_ends_at: null,
    within_withdrawal_period: true,
    cart_id: placed.id,
    channel_id: placed.channel_id,
    company_id: null,
    company_name: null,
    po_document_filename: null,
    po_document_byte_size: null,
    email: placed.email ?? "",
    customer_note: null,
    po_number: null,
    currency: placed.currency,
    locale: placed.locale,
    total_quantity: placed.total_quantity,
    coupon_code: null,
    completed_at: "2026-10-01T11:58:00.000Z",
    fulfillment_status: "unfulfilled",
    payment_status: "none",
    item_total: placed.item_total,
    display_item_total: placed.display_item_total,
    discount_total: placed.discount_total,
    display_discount_total: placed.display_discount_total,
    tax_total: placed.tax_total,
    display_tax_total: placed.display_tax_total,
    included_tax_total: placed.included_tax_total,
    display_included_tax_total: placed.display_included_tax_total,
    additional_tax_total: placed.additional_tax_total,
    display_additional_tax_total: placed.display_additional_tax_total,
    delivery_total: placed.delivery_total,
    display_delivery_total: placed.display_delivery_total,
    fee_total: placed.fee_total,
    display_fee_total: placed.display_fee_total,
    gift_card_total: placed.gift_card_total,
    display_gift_card_total: placed.display_gift_card_total,
    store_credit_total: placed.store_credit_total,
    display_store_credit_total: placed.display_store_credit_total,
    total: placed.total,
    display_total: placed.display_total,
    amount_due: placed.total,
    display_amount_due: placed.display_total,
    covered_by_store_credit: false,
    payments: [
      { ...checkPayment("py_3Qm8Kv5t", "121.00"), status: "checkout" },
    ],
    adjustment_total: placed.adjustment_total,
    display_adjustment_total: placed.display_adjustment_total,
    discounts: [],
    fees: [],
    items: placed.items,
    fulfillments: placed.fulfillments,
    billing_address: guestAddress,
    shipping_address: placed.shipping_address,
    gift_card: null,
    market: orderMarket,
  };
})();
