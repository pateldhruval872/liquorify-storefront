import { type ReactNode, useEffect } from "react";
import { providers, StandIn } from "./payment-providers";

/**
 * Stands in for `@stripe/react-stripe-js` in every story (`.storybook/main.ts`).
 * Stripe's elements render inside Stripe's own frames, which load from Stripe;
 * here each element is a labelled box, and the hooks answer as Stripe's would,
 * refusing a confirmation when the story asks for it.
 */

const elements = {
  update: () => {},
  submit: async () => ({}),
  fetchUpdates: async () => ({}),
};

export const standInStripe = {
  confirmPayment: async () =>
    providers.refuseWith
      ? { error: { message: providers.refuseWith } }
      : { paymentIntent: { status: "succeeded" } },
  confirmCardPayment: async () =>
    providers.refuseWith
      ? { error: { message: providers.refuseWith } }
      : { paymentIntent: { status: "succeeded" } },
  createPaymentMethod: async () => ({ paymentMethod: { id: "pm_stand_in" } }),
};

export function Elements({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useStripe() {
  return standInStripe;
}

export function useElements() {
  return elements;
}

export function PaymentElement() {
  return (
    <StandIn
      label="Stripe's Payment Element (stand-in: Stripe's frame does not load in a story)"
      height={220}
    />
  );
}

interface ExpressCheckoutElementProps {
  onReady?: (event: {
    availablePaymentMethods?: {
      applePay: boolean;
      googlePay: boolean;
      link: boolean;
    };
  }) => void;
  onConfirm?: (event: unknown) => void;
  options?: { layout?: { maxColumns?: number } };
}

const walletNames = {
  applePay: "Apple Pay",
  googlePay: "Google Pay",
  link: "Link",
} as const;

/**
 * What a wallet hands back once the shopper approves, invented and shaped as
 * Stripe's confirm event.
 */
const approvedWallet = {
  expressPaymentType: "apple_pay",
  billingDetails: {
    name: "Jordan Ellis",
    email: "jordan.ellis@example.com",
    phone: "+1 718 555 0142",
    address: {
      line1: "55 Water Street",
      line2: null,
      city: "Brooklyn",
      state: "NY",
      postal_code: "11201",
      country: "US",
    },
  },
  shippingAddress: undefined,
  paymentFailed: () => {},
};

/**
 * Reports the wallets the story asks for, as Stripe does once its frame
 * loads. Each wallet is a labelled box; pressing it confirms as if the
 * shopper approved the payment in the wallet's sheet.
 */
export function ExpressCheckoutElement({
  onReady,
  onConfirm,
  options,
}: ExpressCheckoutElementProps) {
  useEffect(() => {
    if (providers.wallets === null) return;
    onReady?.({ availablePaymentMethods: providers.wallets });
  }, [onReady]);
  const wallets = (
    Object.keys(walletNames) as (keyof typeof walletNames)[]
  ).filter((wallet) => providers.wallets?.[wallet]);
  const columns = options?.layout?.maxColumns ?? 1;
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {wallets.map((wallet) => (
        <button
          key={wallet}
          type="button"
          className="block w-full"
          onClick={() => onConfirm?.(approvedWallet)}
        >
          <StandIn
            label={`Stripe's ${walletNames[wallet]} button (stand-in)`}
            height={48}
          />
        </button>
      ))}
    </div>
  );
}
