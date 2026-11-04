import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, mocked, waitFor, within } from "storybook/test";
import { StripePaymentForm } from "../../src/components/checkout/StripePaymentForm";

/**
 * The card form for Stripe, mocked: Stripe's Payment Element is drawn by
 * Stripe in its own frame, so here it is a labelled stand-in. What the
 * stories show is the storefront's part around it.
 */
const meta = {
  title: "Storefront/Checkout/Stripe payment form",
  component: StripePaymentForm,
  tags: ["CMP-SF-G-04"],
  args: { clientSecret: "stand-in-client-secret", onReady: fn() },
  decorators: [
    (Story) => (
      <div className="max-w-[520px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof StripePaymentForm>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadyMocked: Story = { name: "Ready, mocked" };

/** Stripe declined the card; the message is the one Stripe answers with. */
export const DeclinedMocked: Story = {
  name: "Declined, mocked",
  parameters: {
    liquorify: { providers: { refuseWith: "Your card was declined." } },
  },
  play: async ({ args, canvasElement }) => {
    await waitFor(() => expect(args.onReady).toHaveBeenCalled());
    const [handle] = mocked(args.onReady).mock.calls[0];
    await handle.confirmPayment("/us/en/confirm-payment/cart_8Wd3Kq6n");
    await within(canvasElement).findByText("Your card was declined.");
  },
};
