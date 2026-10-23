import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { OrderList } from "../../src/components/account/OrderList";
import { inAccountColumn } from "../decorators/account-column";
import { accountOrders, shippedOrder } from "../fixtures/account";

/** The Orders page's table, newest first, with payment and shipment status. */
const meta = {
  title: "Storefront/Account/Order list",
  component: OrderList,
  tags: ["CMP-SF-G-01"],
  parameters: { layout: "fullscreen" },
  args: { orders: accountOrders, basePath: "/us/en", locale: "en" },
  decorators: [inAccountColumn],
} satisfies Meta<typeof OrderList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OrdersListed: Story = { name: "Orders listed" };

export const OneOrder: Story = {
  name: "One order",
  args: { orders: [shippedOrder] },
};
