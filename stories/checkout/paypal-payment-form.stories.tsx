import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn, within } from "storybook/test";
import { PayPalPaymentForm } from "../../src/components/checkout/PayPalPaymentForm";
import { pressStandIn } from "../mocks/payment-providers";

/**
 * PayPal's buttons, mocked: PayPal draws them in its own frame, so here they
 * are a labelled stand-in whose links answer as PayPal's window does when the
 * shopper approves, cancels or meets an error.
 */
const meta = {
  title: "Storefront/Checkout/PayPal payment form",
  component: PayPalPaymentForm,
  tags: ["CMP-SF-G-04"],
  args: {
    paypalOrderId: "STAND-IN-PAYPAL-ORDER",
    currency: "usd",
    onReady: fn(),
    onApproved: fn(),
  },
  decorators: [
    (Story) => (
      <div className="max-w-[520px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PayPalPaymentForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadyMocked: Story = {
  name: "Ready, mocked",
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText(/PayPal's buttons/);
  },
};

/** Approved in PayPal's window: checkout goes on to place the order. */
export const ApprovedMocked: Story = {
  name: "Approved, mocked",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await pressStandIn(
      await canvas.findByRole("button", { name: "Approve in PayPal" }),
    );
    await canvas.findByText(
      "PayPal payment approved. Completing your order...",
    );
  },
};

export const CancelledMocked: Story = {
  name: "Cancelled, mocked",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await pressStandIn(
      await canvas.findByRole("button", { name: "Cancel in PayPal" }),
    );
    await canvas.findByText("PayPal payment was cancelled.");
  },
};

export const FailedMocked: Story = {
  name: "Failed, mocked",
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await pressStandIn(
      await canvas.findByRole("button", { name: "Fail in PayPal" }),
    );
    await canvas.findByText("An error occurred with PayPal. Please try again.");
  },
};
