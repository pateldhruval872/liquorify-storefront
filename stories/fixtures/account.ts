import type {
  Address,
  Country,
  CreditCard,
  Customer,
  Fulfillment,
  GiftCard,
  LineItem,
  Order,
  Payment,
  PaymentMethod,
} from "@spree/sdk";
import { lineItem } from "./cart";
import { unitedStates } from "./markets";

/**
 * A signed-in shopper's records, shaped like the Store API's answers for the
 * account pages (`/customers/me` and its addresses, cards, gift cards and
 * orders). Every name, address and number is invented.
 */

function address(
  fields: Partial<Address> &
    Pick<
      Address,
      "id" | "first_name" | "last_name" | "address1" | "city" | "postal_code"
    >,
): Address {
  return {
    label: null,
    full_name: `${fields.first_name} ${fields.last_name}`,
    address2: null,
    phone: null,
    company: null,
    country_name: "United States",
    country_code: "US",
    country_iso: "US",
    state_text: "NY",
    state_code: "NY",
    state_abbr: "NY",
    state_name: "New York",
    quick_checkout: false,
    is_default_billing: false,
    is_default_shipping: false,
    ...fields,
  };
}

export const homeAddress = address({
  id: "addr_4Kd8Pq2w",
  first_name: "Avery",
  last_name: "Quinn",
  address1: "148 Orchard Street",
  city: "New York",
  postal_code: "10002",
  phone: "212-555-0148",
  is_default_billing: true,
  is_default_shipping: true,
});

export const studioAddress = address({
  id: "addr_9Rt3Xn6v",
  first_name: "Avery",
  last_name: "Quinn",
  company: "Quinn Studio",
  address1: "2200 Mission Street",
  address2: "Suite 4",
  city: "San Francisco",
  postal_code: "94110",
  phone: "415-555-0122",
  state_text: "CA",
  state_code: "CA",
  state_abbr: "CA",
  state_name: "California",
});

/** The shortest address the API returns: no company, second line or phone. */
export const minimalAddress = address({
  id: "addr_2Wm7Hc5j",
  first_name: "Avery",
  last_name: "Quinn",
  address1: "9 Harbor Lane",
  city: "Portland",
  postal_code: "04101",
  state_text: "ME",
  state_code: "ME",
  state_abbr: "ME",
  state_name: "Maine",
});

export const customer: Customer = {
  id: "cust_7Hq2Rv5n",
  email: "avery.quinn@example.com",
  first_name: "Avery",
  last_name: "Quinn",
  phone: "212-555-0148",
  accepts_email_marketing: false,
  email_marketing_consent_updated_at: null,
  full_name: "Avery Quinn",
  available_store_credit_total: "0.00",
  display_available_store_credit_total: "$0.00",
  addresses: [homeAddress, studioAddress],
  default_billing_address: homeAddress,
  default_shipping_address: homeAddress,
  newsletter_subscriber: null,
  customer_groups: [],
};

/** A customer who registered without a name, as the API allows. */
export const customerWithoutName: Customer = {
  ...customer,
  id: "cust_3Lp8Td1z",
  email: "shopper@example.com",
  first_name: null,
  last_name: null,
  full_name: "",
  addresses: [],
  default_billing_address: null,
  default_shipping_address: null,
};

/** The United States with a few of its states, as `/countries/US?expand=states` answers. */
export const unitedStatesWithStates: Country = {
  iso: "US",
  iso3: "USA",
  name: "United States",
  states_required: true,
  zipcode_required: true,
  states: [
    { abbr: "CA", name: "California" },
    { abbr: "IL", name: "Illinois" },
    { abbr: "ME", name: "Maine" },
    { abbr: "NY", name: "New York" },
    { abbr: "WA", name: "Washington" },
  ],
};

/** A country whose states are not in the database, so the form asks for a typed region. */
export const unitedKingdom: Country = {
  iso: "GB",
  iso3: "GBR",
  name: "United Kingdom",
  states_required: false,
  zipcode_required: true,
};

export const visaCard: CreditCard = {
  id: "card_5Ns2Kq8d",
  brand: "visa",
  last4: "4242",
  month: 8,
  year: 2028,
  name: "Avery Quinn",
  default: true,
  gateway_payment_profile_id: null,
};

export const mastercardCard: CreditCard = {
  id: "card_8Tw4Bj1m",
  brand: "master",
  last4: "4444",
  month: 3,
  year: 2027,
  name: null,
  default: false,
  gateway_payment_profile_id: null,
};

export const amexCard: CreditCard = {
  id: "card_1Hc6Vz9p",
  brand: "american_express",
  last4: "0005",
  month: 11,
  year: 2029,
  name: "Quinn Studio",
  default: false,
  gateway_payment_profile_id: null,
};

function giftCard(
  fields: Partial<GiftCard> &
    Pick<GiftCard, "id" | "code" | "status" | "amount" | "amount_used">,
): GiftCard {
  // Spree reports what is left whatever the status, so a canceled or
  // expired card still shows its unspent balance.
  const remaining = (
    Number(fields.amount) - Number(fields.amount_used)
  ).toFixed(2);
  return {
    currency: "USD",
    amount_authorized: "0.00",
    amount_remaining: remaining,
    display_amount: `$${fields.amount}`,
    display_amount_used: `$${fields.amount_used}`,
    display_amount_remaining: `$${remaining}`,
    expires_at: null,
    redeemed_at: null,
    expired: false,
    active: fields.status === "active",
    ...fields,
  };
}

export const activeGiftCard = giftCard({
  id: "gc_6Rb3Mw8q",
  code: "8F2C61D9A47B03E5",
  status: "active",
  amount: "25.00",
  amount_used: "0.00",
});

/**
 * A card with money left on it. The API reports `active: false` for a partly
 * used card, so the list shows it with the used and expired cards.
 */
export const partiallyUsedGiftCard = giftCard({
  id: "gc_2Px9Fh4c",
  code: "D4E07A3B91C85F26",
  status: "partially_redeemed",
  amount: "50.00",
  amount_used: "37.00",
  expires_at: "2027-06-30",
});

export const redeemedGiftCard = giftCard({
  id: "gc_9Qd5Ln2t",
  code: "3A9B6E14C0F2D785",
  status: "redeemed",
  amount: "10.00",
  amount_used: "10.00",
  redeemed_at: "2026-09-22T10:15:00.000Z",
});

export const canceledGiftCard = giftCard({
  id: "gc_4Vk1Sy7h",
  code: "7C1E5B0A2D96F348",
  status: "canceled",
  amount: "15.00",
  amount_used: "0.00",
});

export const expiredGiftCard = giftCard({
  id: "gc_7Ju8Gr3e",
  code: "B5F3D8027E1A4C69",
  status: "expired",
  amount: "20.00",
  amount_used: "0.00",
  expires_at: "2026-09-15",
  expired: true,
});

export const overshirt = lineItem({
  id: "li_3Fq7Wd2k",
  variant_id: "variant_8Kc3Np1x",
  name: "Linen Overshirt",
  slug: "linen-overshirt",
  options_text: "Size: M, Color: Sand",
  price: "68.00",
  quantity: 1,
  thumbnail_url: "/fixtures/product-sand.png",
});

export const toteBags = lineItem({
  id: "li_8Bn2Hs6y",
  variant_id: "variant_3Vb9Hm2q",
  name: "Canvas Tote Bag",
  slug: "canvas-tote-bag",
  price: "24.00",
  quantity: 2,
});

export const beanie = lineItem({
  id: "li_5Zt9Cv1r",
  variant_id: "variant_6Mq4Jx8g",
  name: "Merino Beanie",
  slug: "merino-beanie",
  options_text: "Color: Charcoal",
  price: "32.00",
  quantity: 1,
});

const standardShipping = {
  id: "dm_2Yc8Lk5f",
  name: "Standard Shipping",
  code: null,
  estimated_transit_business_days_min: 3,
  estimated_transit_business_days_max: 5,
  digital: false,
  pickup: false,
  pickup_point: false,
};

const warehouse = {
  id: "sloc_4Gm1Rz7p",
  name: "Brooklyn Warehouse",
  address1: null,
  city: null,
  zipcode: null,
  country_code: "US" as const,
  country_name: "United States",
  state_code: null,
  state_text: null,
  country_iso: "US",
  state_abbr: null,
  pickup_ready_in_minutes: null,
  pickup_instructions: null,
};

function fulfillment(
  fields: Partial<Fulfillment> & Pick<Fulfillment, "id" | "number" | "status">,
  items: LineItem[],
): Fulfillment {
  const rateId = `dr_${fields.id.slice(4)}`;
  return {
    tracking: null,
    tracking_url: null,
    pickup_point_data: null,
    selected_delivery_rate_id: rateId,
    unpriced: false,
    cost: "5.00",
    display_cost: "$5.00",
    total: "5.00",
    display_total: "$5.00",
    discount_total: "0.00",
    display_discount_total: "$0.00",
    additional_tax_total: "0.00",
    display_additional_tax_total: "$0.00",
    included_tax_total: "0.00",
    display_included_tax_total: "$0.00",
    tax_total: "0.00",
    display_tax_total: "$0.00",
    fulfillment_type: "shipping",
    fulfilled_at: null,
    delivered_at: null,
    items: items.map((item) => ({
      item_id: item.id,
      variant_id: item.variant_id,
      quantity: item.quantity,
    })),
    deliveries: [],
    delivery_method: standardShipping,
    stock_location: warehouse,
    delivery_rates: [
      {
        id: rateId,
        delivery_method_id: standardShipping.id,
        name: standardShipping.name,
        selected: true,
        cost: "5.00",
        total: "5.00",
        additional_tax_total: "0.00",
        included_tax_total: "0.00",
        tax_total: "0.00",
        carrier: null,
        service_level: null,
        estimated_delivery_date: null,
        unpriced: false,
        freight_summary: null,
        display_cost: "$5.00",
        display_total: "$5.00",
        display_additional_tax_total: "$0.00",
        display_included_tax_total: "$0.00",
        display_tax_total: "$0.00",
        delivery_method: standardShipping,
      },
    ],
    ...fields,
  };
}

function shipped(
  fields: Pick<Fulfillment, "id" | "number"> & { tracking: string },
  items: LineItem[],
  fulfilledAt: string,
): Fulfillment {
  const trackingUrl = `https://www.ups.com/track?tracknum=${fields.tracking}`;
  return fulfillment(
    {
      ...fields,
      status: "fulfilled",
      tracking_url: trackingUrl,
      fulfilled_at: fulfilledAt,
      deliveries: [
        {
          id: `dlv_${fields.id.slice(4)}`,
          tracking_number: fields.tracking,
          carrier: "ups",
          carrier_name: "UPS",
          service: null,
          status: "pending",
          tracking_url: trackingUrl,
          estimated_delivery_at: null,
          delivered_at: null,
        },
      ],
    },
    items,
  );
}

const cardMethod: PaymentMethod = {
  id: "pm_6Dw3Ns9b",
  name: "Credit Card",
  description: null,
  type: "stripe",
  session_required: true,
  source_required: true,
};

const storeCreditMethod: PaymentMethod = {
  id: "pm_1Kx7Qa4m",
  name: "Store Credit",
  description: "Store Credit",
  type: "store_credit",
  session_required: false,
  source_required: true,
};

const checkMethod: PaymentMethod = {
  id: "pm_9Bf2Tc6r",
  name: "Check",
  description: null,
  type: "check",
  session_required: false,
  source_required: false,
};

export function cardPayment(
  id: string,
  amount: string,
  card: CreditCard = visaCard,
): Payment {
  return {
    id,
    payment_method_id: cardMethod.id,
    response_code: "ch_3Pq8Lx2v",
    number: `${id.slice(3)}-P1`,
    status: "completed",
    amount,
    display_amount: `$${amount}`,
    source_type: "credit_card",
    source_id: card.id,
    source: card,
    payment_method: cardMethod,
  };
}

export function storeCreditPayment(
  id: string,
  amount: string,
  remaining: string,
): Payment {
  return {
    id,
    payment_method_id: storeCreditMethod.id,
    response_code: null,
    number: `${id.slice(3)}-P2`,
    status: "completed",
    amount,
    display_amount: `$${amount}`,
    source_type: "store_credit",
    source_id: `credit_${id.slice(3)}`,
    source: {
      id: `credit_${id.slice(3)}`,
      amount,
      amount_used: amount,
      amount_remaining: remaining,
      display_amount: `$${amount}`,
      display_amount_used: `$${amount}`,
      display_amount_remaining: `$${remaining}`,
      currency: "USD",
    },
    payment_method: storeCreditMethod,
  };
}

export function checkPayment(id: string, amount: string): Payment {
  return {
    id,
    payment_method_id: checkMethod.id,
    response_code: null,
    number: `${id.slice(3)}-P3`,
    status: "completed",
    amount,
    display_amount: `$${amount}`,
    source_type: null,
    source_id: null,
    source: null,
    payment_method: checkMethod,
  };
}

// Orders carry their market without its countries.
const { countries: _countries, ...orderMarket } = unitedStates;

function money(amount: number) {
  return amount.toFixed(2);
}

function order(
  fields: Partial<Order> &
    Pick<Order, "id" | "number" | "completed_at" | "items" | "fulfillments">,
): Order {
  const itemTotal = fields.items.reduce(
    (sum, item) => sum + Number(item.total),
    0,
  );
  const deliveryTotal = fields.fulfillments.reduce(
    (sum, item) => sum + Number(item.cost),
    0,
  );
  const total = itemTotal + deliveryTotal;
  return {
    market_id: unitedStates.id,
    withdrawal_period_ends_at: null,
    within_withdrawal_period: true,
    cart_id: null,
    channel_id: "ch_4Tn8vB2x",
    company_id: null,
    company_name: null,
    po_document_filename: null,
    po_document_byte_size: null,
    email: customer.email,
    customer_note: null,
    po_number: null,
    currency: "USD",
    locale: "en",
    total_quantity: fields.items.reduce((sum, item) => sum + item.quantity, 0),
    coupon_code: null,
    fulfillment_status: "unfulfilled",
    payment_status: "paid",
    item_total: money(itemTotal),
    display_item_total: `$${money(itemTotal)}`,
    discount_total: "0.00",
    display_discount_total: "$0.00",
    tax_total: "0.00",
    display_tax_total: "$0.00",
    included_tax_total: "0.00",
    display_included_tax_total: "$0.00",
    additional_tax_total: "0.00",
    display_additional_tax_total: "$0.00",
    delivery_total: money(deliveryTotal),
    display_delivery_total: `$${money(deliveryTotal)}`,
    fee_total: "0.00",
    display_fee_total: "$0.00",
    gift_card_total: "0.00",
    display_gift_card_total: "$0.00",
    store_credit_total: "0.00",
    display_store_credit_total: "$0.00",
    total: money(total),
    display_total: `$${money(total)}`,
    amount_due: "0.00",
    display_amount_due: "$0.00",
    covered_by_store_credit: false,
    payments: [cardPayment(`py_${fields.id.slice(3)}`, money(total))],
    adjustment_total: "0.00",
    display_adjustment_total: "$0.00",
    discounts: [],
    fees: [],
    billing_address: homeAddress,
    shipping_address: homeAddress,
    gift_card: null,
    market: orderMarket,
    ...fields,
  };
}

/** Shipped in one parcel with a tracking link. */
export const shippedOrder = order({
  id: "or_5Gk2Tn8w",
  number: "R100000021",
  completed_at: "2026-09-12T14:20:00.000Z",
  fulfillment_status: "fulfilled",
  items: [overshirt],
  fulfillments: [
    shipped(
      {
        id: "ful_5Gk2Tn8w",
        number: "R100000021-F1",
        tracking: "1Z999AA10123456784",
      },
      [overshirt],
      "2026-09-13T09:00:00.000Z",
    ),
  ],
});

/** Two parcels, one shipped; sent to a second address with a note. */
export const partiallyShippedOrder = order({
  id: "or_8Mv3Hd6q",
  number: "R100000034",
  completed_at: "2026-09-18T10:05:00.000Z",
  fulfillment_status: "partial",
  customer_note: "Leave at the front desk",
  shipping_address: studioAddress,
  billing_address: studioAddress,
  items: [toteBags, beanie],
  fulfillments: [
    shipped(
      {
        id: "ful_8Mv3Hd6q",
        number: "R100000034-F1",
        tracking: "1Z999AA10123456785",
      },
      [toteBags],
      "2026-09-19T08:30:00.000Z",
    ),
    fulfillment(
      { id: "ful_2Qe7Bk4x", number: "R100000034-F2", status: "unfulfilled" },
      [beanie],
    ),
  ],
  payments: [cardPayment("py_8Mv3Hd6q", "90.00", mastercardCard)],
});

/**
 * Not yet shipped, paid in full by a gift card. A gift card is redeemed as
 * store credit, so its payment is a store credit payment of the same amount.
 */
export const unfulfilledOrder = order({
  id: "or_3Wp9Ls1d",
  number: "R100000047",
  completed_at: "2026-09-22T10:15:00.000Z",
  items: [beanie],
  fulfillments: [
    fulfillment(
      { id: "ful_3Wp9Ls1d", number: "R100000047-F1", status: "unfulfilled" },
      [beanie],
    ),
  ],
  gift_card: partiallyUsedGiftCard,
  gift_card_total: "37.00",
  display_gift_card_total: "$37.00",
  payments: [storeCreditPayment("py_3Wp9Ls1d", "37.00", "13.00")],
});

/**
 * Canceled before it shipped: the parcel is canceled and the payment voided,
 * so the order reports no payment, as Spree's API does.
 */
export const canceledOrder = order({
  id: "or_6Ty4Nc2h",
  number: "R100000052",
  completed_at: "2026-09-25T16:40:00.000Z",
  fulfillment_status: "canceled",
  payment_status: "none",
  items: [toteBags],
  fulfillments: [
    fulfillment(
      { id: "ful_6Ty4Nc2h", number: "R100000052-F1", status: "canceled" },
      [toteBags],
    ),
  ],
  payments: [{ ...checkPayment("py_6Ty4Nc2h", "53.00"), status: "void" }],
});

/** A placed order with no parcels, so its items are listed on their own. */
export const orderWithoutFulfillments = order({
  id: "or_1Rx6Fm9b",
  number: "R100000058",
  completed_at: "2026-09-27T12:00:00.000Z",
  items: [overshirt],
  fulfillments: [],
  delivery_total: "0.00",
  display_delivery_total: "$0.00",
  total: "68.00",
  display_total: "$68.00",
  payments: [checkPayment("py_1Rx6Fm9b", "68.00")],
});

export const accountOrders = [
  canceledOrder,
  unfulfilledOrder,
  partiallyShippedOrder,
  shippedOrder,
];

/**
 * An order whose totals use every row: a discount, tax, a gift card and store
 * credit, with an amount still due.
 */
export const orderWithEveryTotal = order({
  ...partiallyShippedOrder,
  id: "or_9Kd2Wm5t",
  number: "R100000063",
  payment_status: "partially_paid",
  payments: [
    storeCreditPayment("py_9Kd2Wm5t", "25.00", "0.00"),
    storeCreditPayment("py_4Hs8Qe1n", "10.00", "15.00"),
  ],
  discount_total: "-9.00",
  display_discount_total: "-$9.00",
  tax_total: "7.29",
  display_tax_total: "$7.29",
  additional_tax_total: "7.29",
  display_additional_tax_total: "$7.29",
  total: "88.29",
  display_total: "$88.29",
  gift_card_total: "25.00",
  display_gift_card_total: "$25.00",
  store_credit_total: "10.00",
  display_store_credit_total: "$10.00",
  amount_due: "53.29",
  display_amount_due: "$53.29",
});
