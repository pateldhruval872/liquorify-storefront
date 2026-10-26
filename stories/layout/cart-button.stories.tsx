import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { CartButton } from "../../src/components/layout/CartButton";
import { cartWithItems } from "../fixtures/cart";

/** The count is the number of items, quantities included. */
const meta = {
  title: "Storefront/Layout/Cart button",
  component: CartButton,
  tags: ["CMP-SF-G-06"],
  parameters: { liquorify: { storefront: true } },
} satisfies Meta<typeof CartButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithItems: Story = {
  name: "With items",
  parameters: { liquorify: { cart: cartWithItems } },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(
        String(cartWithItems.total_quantity),
      ),
    ).toBeVisible();
  },
};
