import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FulfillmentBlock } from "../../src/components/order/FulfillmentBlock";
import { inAccountColumn } from "../decorators/account-column";
import {
  canceledOrder,
  homeAddress,
  partiallyShippedOrder,
  shippedOrder,
  unfulfilledOrder,
} from "../fixtures/account";

/** One shipment of an order: where it goes, how, its status and its items. */
const meta = {
  title: "Storefront/Order/Fulfillment block",
  component: FulfillmentBlock,
  tags: ["CMP-SF-G-08"],
  args: {
    fulfillment: shippedOrder.fulfillments[0],
    shipAddress: homeAddress,
    basePath: "/us/en",
    lineItems: shippedOrder.items,
  },
  parameters: { layout: "fullscreen" },
  decorators: [inAccountColumn],
} satisfies Meta<typeof FulfillmentBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sent, so Track Items opens the carrier's page. */
export const Shipped: Story = {};

/** Not sent yet: tracking is unavailable and the block says so. */
export const AwaitingShipment: Story = {
  name: "Awaiting shipment",
  args: {
    fulfillment: unfulfilledOrder.fulfillments[0],
    lineItems: unfulfilledOrder.items,
  },
};

/** Canceled before it was sent, with the refund notice. */
export const Canceled: Story = {
  args: {
    fulfillment: canceledOrder.fulfillments[0],
    lineItems: canceledOrder.items,
  },
};

/** Two items in one shipment. */
export const SeveralItems: Story = {
  name: "Several items",
  args: {
    fulfillment: {
      ...partiallyShippedOrder.fulfillments[0],
      items: partiallyShippedOrder.items.map((item) => ({
        item_id: item.id,
        variant_id: item.variant_id,
        quantity: item.quantity,
      })),
    },
    shipAddress: partiallyShippedOrder.shipping_address,
    lineItems: partiallyShippedOrder.items,
  },
};

export const WithoutAddress: Story = {
  name: "Without address",
  args: { shipAddress: null },
};
