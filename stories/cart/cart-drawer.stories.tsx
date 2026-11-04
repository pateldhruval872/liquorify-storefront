import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect } from "react";
import { expect, userEvent, within } from "storybook/test";
import { CartDrawer } from "../../src/components/cart/CartDrawer";
import { Toaster } from "../../src/components/ui/sonner";
import { useCart } from "../../src/contexts/CartContext";
import { cartWithItems, emptyCart } from "../fixtures/cart";
import { StorefrontHeader } from "../layout/storefront-header";

/**
 * The drawer opens from the header's cart button; here it opens on mount. As
 * when a shopper opens it from the keyboard, focus moves to the close button
 * and its focus ring shows. Opened with a click, the ring is not drawn.
 */
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

const drawer = () => within(document.body).findByRole("dialog");

/** The first item's quantity raised by one; Spree answers with the new totals. */
export const QuantityChanged: Story = {
  name: "Quantity changed",
  parameters: { liquorify: { cart: cartWithItems } },
  play: async () => {
    const [increase] = await within(await drawer()).findAllByRole("button", {
      name: "Increase quantity",
    });
    await userEvent.click(increase);
    await within(await drawer()).findByText("4 items", { exact: false });
  },
};

export const ItemRemoved: Story = {
  name: "Item removed",
  parameters: { liquorify: { cart: cartWithItems } },
  play: async () => {
    await userEvent.click(
      await within(await drawer()).findByRole("button", {
        name: "Remove Canvas Tote Bag",
      }),
    );
    await expect(
      within(await drawer()).queryByText("Canvas Tote Bag"),
    ).not.toBeInTheDocument();
  },
};

/** While Spree answers a change, the drawer's controls wait. */
export const Updating: Story = {
  parameters: { liquorify: { cart: cartWithItems, holdWrites: true } },
  play: async () => {
    const [increase] = await within(await drawer()).findAllByRole("button", {
      name: "Increase quantity",
    });
    await userEvent.click(increase);
    await expect(increase).toBeDisabled();
  },
};

/**
 * The toaster as the locale layout mounts it, with toasts kept until
 * dismissed so the capture does not depend on timing (the storefront's own
 * toasts close after four seconds).
 */
const withToaster: NonNullable<Meta["decorators"]> = [
  (Story) => (
    <>
      <Story />
      <Toaster duration={Number.POSITIVE_INFINITY} />
    </>
  ),
];

/** Spree refused the change; the toaster shows Spree's message. */
export const UpdateFailed: Story = {
  name: "Update failed",
  decorators: withToaster,
  parameters: {
    liquorify: { cart: cartWithItems, failWith: "Quantity must be at most 1" },
  },
  play: async () => {
    const [increase] = await within(await drawer()).findAllByRole("button", {
      name: "Increase quantity",
    });
    await userEvent.click(increase);
    await within(document.body).findByText("Quantity must be at most 1");
  },
};

export const RemoveFailed: Story = {
  name: "Remove failed",
  decorators: withToaster,
  parameters: {
    liquorify: {
      cart: cartWithItems,
      failWith: "Could not remove this item from your cart. Please try again.",
    },
  },
  play: async () => {
    await userEvent.click(
      await within(await drawer()).findByRole("button", {
        name: "Remove Canvas Tote Bag",
      }),
    );
    await within(document.body).findByText(
      "Could not remove this item from your cart. Please try again.",
    );
  },
};

/** The header with the drawer closed, as on every storefront page. */
function HeaderWithDrawer({ adding }: { adding?: string }) {
  const { addItem } = useCart();
  useEffect(() => {
    if (adding) addItem(adding, 1);
  }, [adding, addItem]);
  return (
    <>
      <StorefrontHeader />
      <CartDrawer />
    </>
  );
}

/**
 * Opened from the header with a mouse click, which the visual check makes
 * with the real mouse: the close button takes focus without a focus ring.
 */
export const OpenedWithPointer: StoryObj<typeof HeaderWithDrawer> = {
  name: "Opened with a pointer",
  render: () => <HeaderWithDrawer />,
  parameters: {
    liquorify: {
      cart: cartWithItems,
      pointerClick: { button: "Open cart", opens: "dialog" },
    },
  },
};

/** Adding from a product page failed: the drawer stays closed and the toaster says why. */
export const AddFailed: StoryObj<typeof HeaderWithDrawer> = {
  name: "Add failed",
  render: () => <HeaderWithDrawer adding="variant_8Kc3Np1x" />,
  decorators: withToaster,
  parameters: {
    liquorify: {
      cart: cartWithItems,
      failWith: "Linen Overshirt is out of stock",
    },
  },
  play: async () => {
    await within(document.body).findByText("Linen Overshirt is out of stock");
  },
};
