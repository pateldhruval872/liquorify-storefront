import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OrderTotals } from "../../src/components/order/OrderTotals";
import {
  orderWithEveryTotal,
  shippedOrder,
  unfulfilledOrder,
} from "../fixtures/account";

/** Rows appear only when their amount is not zero. */
const meta = {
  title: "Storefront/Order/Order totals",
  component: OrderTotals,
  tags: ["CMP-SF-G-08"],
  args: { order: shippedOrder },
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof OrderTotals>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const PaidByGiftCard: Story = {
  name: "Paid by gift card",
  args: { order: unfulfilledOrder },
};

export const EveryTotal: Story = {
  name: "Every total",
  args: { order: orderWithEveryTotal },
};
