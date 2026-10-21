import type { Cart, LineItem } from "@spree/sdk";

function lineItem(
  fields: Partial<LineItem> &
    Pick<
      LineItem,
      "id" | "variant_id" | "name" | "slug" | "price" | "quantity"
    >,
): LineItem {
  const total = (Number(fields.price) * fields.quantity).toFixed(2);
  return {
    seller_id: null,
    preorder: false,
    preorder_ships_at: null,
    currency: "USD",
    options_text: "",
    display_price: `$${fields.price}`,
    total,
    display_total: `$${total}`,
    adjustment_total: "0.00",
    display_adjustment_total: "$0.00",
    additional_tax_total: "0.00",
    display_additional_tax_total: "$0.00",
    included_tax_total: "0.00",
    display_included_tax_total: "$0.00",
    discount_total: "0.00",
    display_discount_total: "$0.00",
    pre_tax_amount: total,
    display_pre_tax_amount: `$${total}`,
    discounted_amount: total,
    display_discounted_amount: `$${total}`,
    display_compare_at_amount: "$0.00",
    compare_at_amount: null,
    thumbnail_url: null,
    option_values: [],
    digital_links: [],
    ...fields,
  };
}

function cart(items: LineItem[]): Cart {
  const itemTotal = items
    .reduce((sum, item) => sum + Number(item.total), 0)
    .toFixed(2);
  return {
    id: "cart_5Hn3Kp8v",
    market_id: "mkt_7Rq2Lw9a",
    channel_id: "ch_4Tn8vB2x",
    preferred_stock_location_id: null,
    company_id: null,
    company_name: null,
    po_number_required: false,
    po_document_filename: null,
    po_document_byte_size: null,
    number: "R100000001",
    token: "sample-cart-token",
    email: null,
    customer_note: null,
    po_number: null,
    currency: "USD",
    locale: "en",
    total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
    warnings: [],
    coupon_code: null,
    item_total: itemTotal,
    display_item_total: `$${itemTotal}`,
    discount_total: "0.00",
    display_discount_total: "$0.00",
    tax_total: "0.00",
    display_tax_total: "$0.00",
    included_tax_total: "0.00",
    display_included_tax_total: "$0.00",
    additional_tax_total: "0.00",
    display_additional_tax_total: "$0.00",
    delivery_total: "0.00",
    display_delivery_total: "$0.00",
    fee_total: "0.00",
    display_fee_total: "$0.00",
    gift_card_total: "0.00",
    display_gift_card_total: "$0.00",
    store_credit_total: "0.00",
    display_store_credit_total: "$0.00",
    total: itemTotal,
    display_total: `$${itemTotal}`,
    amount_due: itemTotal,
    display_amount_due: `$${itemTotal}`,
    covered_by_store_credit: false,
    payments: [],
    adjustment_total: "0.00",
    display_adjustment_total: "$0.00",
    current_step: "address",
    completed_steps: [],
    requirements: [],
    order_minimum: null,
    order_minimum_shortfall: null,
    below_order_minimum: false,
    freight_summary: null,
    shipping_eq_billing_address: true,
    discounts: [],
    fees: [],
    items,
    fulfillments: [],
    billing_address: null,
    shipping_address: null,
    payment_methods: [],
    gift_card: null,
    market: null,
  };
}

export const cartWithItems = cart([
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
    compare_at_amount: "32.00",
    display_compare_at_amount: "$32.00",
    quantity: 2,
  }),
]);

export const emptyCart = cart([]);
