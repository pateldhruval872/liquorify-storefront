import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OrderDetail } from "../../src/components/account/OrderDetail";
import { inAccountColumn } from "../decorators/account-column";
import {
  canceledOrder,
  orderWithEveryTotal,
  orderWithoutFulfillments,
  partiallyShippedOrder,
  shippedOrder,
  unfulfilledOrder,
} from "../fixtures/account";

/**
 * One order: a block per shipment with its items and tracking, the
 * customer's note, the billing address and payments, then the totals.
 */
const meta = {
  title: "Storefront/Account/Order detail",
  component: OrderDetail,
  tags: ["CMP-SF-G-01"],
  args: { order: shippedOrder, basePath: "/us/en", locale: "en" },
  parameters: { layout: "fullscreen" },
  decorators: [inAccountColumn],
} satisfies Meta<typeof OrderDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Shipped: Story = {};

/** Two shipments, one sent with tracking; a note from the customer. */
export const PartiallyShipped: Story = {
  name: "Partially shipped",
  args: { order: partiallyShippedOrder },
};

/** Not shipped yet, so there is no tracking; paid by a gift card. */
export const Unfulfilled: Story = { args: { order: unfulfilledOrder } };

/** The shipment is canceled and its voided payment is not listed. */
export const Canceled: Story = { args: { order: canceledOrder } };

export const WithoutShipments: Story = {
  name: "Without shipments",
  args: { order: orderWithoutFulfillments },
};

/** A discount, tax, a gift card and store credit, with an amount still due. */
export const EveryTotal: Story = {
  name: "Every total",
  args: { order: orderWithEveryTotal },
};
