import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, waitFor, within } from "storybook/test";
// The real buttons, by their file: the alias in .storybook/main.ts points
// `@/components/checkout/ExpressCheckoutButton` at a stand-in for every other
// story, as the running storefront shows nothing without a Stripe key.
import { ExpressCheckoutButton } from "../../src/components/checkout/ExpressCheckoutButton";
import { addressedCart, stripeCart } from "../fixtures/checkout";
import { pressStandIn } from "../mocks/payment-providers";

/**
 * Express checkout, mocked: Stripe's Express Checkout Element draws the
 * wallets the shopper's browser offers, in Stripe's own frame. Here each
 * wallet is a labelled stand-in, and pressing one confirms as if the shopper
 * approved the payment in the wallet's sheet. The cart drawer and the cart
 * page show the buttons in one column; checkout shows two, for guests.
 */
const meta = {
  title: "Storefront/Checkout/Express checkout button",
  component: ExpressCheckoutButton,
  tags: ["CMP-SF-G-04"],
  args: {
    cart: stripeCart,
    basePath: "/us/en",
    onComplete: fn(),
    onProcessingChange: fn(),
    onAvailabilityChange: fn(),
  },
  parameters: { liquorify: { checkoutCart: stripeCart } },
  decorators: [
    (Story) => (
      <div className="max-w-[520px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ExpressCheckoutButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneColumnMocked: Story = {
  name: "One column, mocked",
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText("or");
  },
};

export const CheckoutMocked: Story = {
  name: "Two columns at checkout, mocked",
  args: { maxColumns: 2 },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText("or");
  },
};

/** Until Stripe's frame reports the wallets, a spinner holds their place. */
export const LoadingMocked: Story = {
  name: "Loading, mocked",
  parameters: { liquorify: { providers: { wallets: null } } },
};

/** Approved in the wallet, while the order is prepared and paid. */
export const FinalizingMocked: Story = {
  name: "Finalizing, mocked",
  parameters: { liquorify: { checkoutCart: stripeCart, holdWrites: true } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await pressStandIn(
      await canvas.findByRole("button", { name: /Apple Pay button/ }),
    );
    // The overlay fades in over half a second.
    const finalizing = await canvas.findByText("Finalizing your payment...");
    await waitFor(() => expect(finalizing).toBeVisible());
  },
};

/** Spree refused the wallet's address; the message is Spree's. */
export const RefusedMocked: Story = {
  name: "Refused, mocked",
  args: { cart: addressedCart },
  parameters: {
    liquorify: {
      checkoutCart: addressedCart,
      failWith: "We do not deliver to this address.",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await pressStandIn(
      await canvas.findByRole("button", { name: /Apple Pay button/ }),
    );
    await canvas.findByText("We do not deliver to this address.");
  },
};
