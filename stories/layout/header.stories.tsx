import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { cartWithItems } from "../fixtures/cart";
import { europe, unitedStates } from "../fixtures/markets";
import { StorefrontHeader } from "./storefront-header";

/**
 * The account link shows from tablet width; the wholesale link and the
 * region and language control show on a desktop, and in the menu otherwise.
 */
const meta = {
  title: "Storefront/Layout/Header",
  component: StorefrontHeader,
  tags: ["CMP-SF-G-06"],
  parameters: {
    layout: "fullscreen",
    liquorify: { storefront: true, markets: [unitedStates, europe] },
  },
} satisfies Meta<typeof StorefrontHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EmptyCart: Story = {
  name: "Empty cart",
};

export const CartCount: Story = {
  name: "Cart count",
  parameters: { liquorify: { cart: cartWithItems } },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(
        String(cartWithItems.total_quantity),
      ),
    ).toBeVisible();
  },
};

export const WholesaleLink: Story = {
  name: "Wholesale link",
  parameters: { liquorify: { wholesale: true } },
};
