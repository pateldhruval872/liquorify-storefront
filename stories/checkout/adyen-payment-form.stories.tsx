import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, mocked, waitFor, within } from "storybook/test";
import { AdyenPaymentForm } from "../../src/components/checkout/AdyenPaymentForm";

/**
 * The payment form for Adyen, mocked: Adyen's Drop-in loads its payment
 * methods from Adyen, so here it is a labelled stand-in mounted where the
 * storefront mounts the Drop-in.
 */
const meta = {
  title: "Storefront/Checkout/Adyen payment form",
  component: AdyenPaymentForm,
  tags: ["CMP-SF-G-04"],
  args: {
    sessionId: "stand-in-session",
    sessionData: "stand-in-session-data",
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
} satisfies Meta<typeof AdyenPaymentForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadyMocked: Story = {
  name: "Ready, mocked",
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText(/Adyen's Drop-in/);
  },
};

/** Adyen refused the payment; the storefront words it from Adyen's result code. */
export const RefusedMocked: Story = {
  name: "Refused, mocked",
  parameters: { liquorify: { providers: { refuseWith: "Refused" } } },
  play: async ({ args, canvasElement }) => {
    await waitFor(() => expect(args.onReady).toHaveBeenCalled());
    const [handle] = mocked(args.onReady).mock.calls[0];
    await handle.confirmPayment("/us/en/confirm-payment/cart_8Wd3Kq6n");
    await within(canvasElement).findByText(
      "Payment refused. Please try again.",
    );
  },
};
