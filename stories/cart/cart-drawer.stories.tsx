import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect } from "react";
import { CartDrawer } from "../../src/components/cart/CartDrawer";
import { useCart } from "../../src/contexts/CartContext";
import { cartWithItems, emptyCart } from "../fixtures/cart";

/** The drawer opens from the header's cart button; here it opens on mount. */
function OpenCartDrawer() {
  const { openCart } = useCart();
  useEffect(() => {
    openCart();
  }, [openCart]);
  return <CartDrawer />;
}

const meta = {
  title: "Storefront/Cart/Cart drawer",
  component: OpenCartDrawer,
  tags: ["CMP-SF-G-03"],
  parameters: {
    layout: "fullscreen",
    liquorify: { storefront: true, capture: "viewport" },
  },
} satisfies Meta<typeof OpenCartDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithItems: Story = {
  name: "With items",
  parameters: { liquorify: { cart: cartWithItems } },
};

export const Empty: Story = {
  parameters: { liquorify: { cart: emptyCart } },
};

export const Loading: Story = {
  parameters: { liquorify: { cart: "loading" } },
};
