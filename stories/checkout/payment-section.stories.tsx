import type { State } from "@spree/sdk";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { PaymentSection } from "../../src/components/checkout/PaymentSection";
import {
  addressedCart,
  adyenCart,
  checkoutCountries,
  noPaymentMethodsCart,
  paidByGiftCardCart,
  paypalCart,
  savedStripeCards,
  separateBillingCart,
  stripeCart,
  testGatewayCart,
  twoMethodsCart,
} from "../fixtures/checkout";

async function statesOf(iso: string): Promise<State[]> {
  return checkoutCountries.find((country) => country.iso === iso)?.states ?? [];
}

/**
 * Checkout's payment step: the methods the store shows on its storefront, the
 * billing address, and, for a method that needs a payment session, the
 * provider's form. A direct method such as Check is paid by placing the
 * order. The stories named "mocked" draw labelled stand-ins where Stripe's,
 * Adyen's and PayPal's own frames and buttons go, which load only from the
 * providers; they show the storefront around the provider and claim nothing
 * about the provider.
 */
const meta = {
  title: "Storefront/Checkout/Payment section",
  component: PaymentSection,
  tags: ["CMP-SF-G-04"],
  args: {
    cart: addressedCart,
    countries: checkoutCountries,
    isAuthenticated: false,
    fetchStates: statesOf,
    onUpdateBillingAddress: fn(async () => true),
    onPaymentComplete: fn(async () => {}),
    processing: false,
    setProcessing: fn(),
  },
  parameters: { liquorify: { checkoutCart: addressedCart } },
  decorators: [
    (Story) => (
      <div className="max-w-[560px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof PaymentSection>;

export default meta;
type Story = StoryObj<typeof meta>;

const sessionWith = (cart: typeof addressedCart, session?: object) => ({
  args: { cart },
  parameters: { liquorify: { checkoutCart: cart, paymentSession: session } },
});

/** Spree's sample data hides both of its methods from the storefront. */
export const NoPaymentMethods: Story = {
  name: "No payment methods",
  ...sessionWith(noPaymentMethodsCart),
};

export const CheckOnly: Story = { name: "Check, the only method" };

/**
 * The test gateway asks for a payment session, which the storefront has no
 * form for. It comes first, as in Spree's sample data, so it is chosen.
 */
export const TestGatewayAndCheck: Story = {
  name: "Test gateway and Check",
  ...sessionWith(twoMethodsCart, { client_secret: "stand-in-client-secret" }),
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText(
      "This payment method is not yet supported in the storefront.",
    );
  },
};

export const CheckChosen: Story = {
  name: "Check chosen",
  ...sessionWith(twoMethodsCart, { client_secret: "stand-in-client-secret" }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await canvas.findByText(
      "This payment method is not yet supported in the storefront.",
    );
    await userEvent.click(canvas.getByRole("radio", { name: "Check" }));
    await canvas.findByText(
      "You will receive payment instructions after placing your order.",
    );
  },
};

export const TestGatewayOnly: Story = {
  name: "Test gateway only",
  ...sessionWith(testGatewayCart, { client_secret: "stand-in-client-secret" }),
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText(
      "This payment method is not yet supported in the storefront.",
    );
  },
};

/** A gift card covers the whole total. */
export const NothingToPay: Story = {
  name: "Nothing to pay",
  ...sessionWith(paidByGiftCardCart),
};

/** Billing to another address shows the billing form, filled in. */
export const SeparateBilling: Story = {
  name: "Separate billing address",
  ...sessionWith(separateBillingCart),
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("option", { name: "California" });
  },
};

export const LoadingPaymentForm: Story = {
  name: "Loading the payment form",
  args: { cart: testGatewayCart },
  parameters: {
    liquorify: { checkoutCart: testGatewayCart, holdWrites: true },
  },
};

/** Spree refused the payment session; the message is Spree's. */
export const SessionRefused: Story = {
  name: "Payment session refused",
  args: { cart: testGatewayCart },
  parameters: {
    liquorify: {
      checkoutCart: testGatewayCart,
      failWith: "Payment method is not available for this order",
    },
  },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText(
      "Payment method is not available for this order",
    );
  },
};

export const StripeMocked: Story = {
  name: "Stripe, mocked",
  ...sessionWith(stripeCart, { client_secret: "stand-in-client-secret" }),
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText(/Stripe's Payment Element/);
  },
};

/**
 * A signed-in customer's cards saved with Stripe, the default one chosen.
 * The card's brand is read as SD-1 records; these cards carry one.
 */
export const StripeSavedCardsMocked: Story = {
  name: "Stripe saved cards, mocked",
  args: { cart: stripeCart, isAuthenticated: true },
  parameters: {
    liquorify: {
      checkoutCart: stripeCart,
      creditCards: savedStripeCards,
      paymentSession: { client_secret: "stand-in-client-secret" },
    },
  },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText("Add new payment method");
  },
};

export const AdyenMocked: Story = {
  name: "Adyen, mocked",
  ...sessionWith(adyenCart, { session_data: "stand-in-session-data" }),
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByText(/Adyen's Drop-in/);
  },
};

export const PayPalMocked: Story = {
  name: "PayPal, mocked",
  ...sessionWith(paypalCart, { id: "STAND-IN-PAYPAL-ORDER" }),
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(/PayPal's buttons/),
    ).toBeVisible();
  },
};
