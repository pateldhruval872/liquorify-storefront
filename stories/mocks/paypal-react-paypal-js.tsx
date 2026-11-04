import type { ReactNode } from "react";
import { StandIn } from "./payment-providers";

/**
 * Stands in for `@paypal/react-paypal-js` in every story
 * (`.storybook/main.ts`). PayPal's buttons render in PayPal's own frame; here
 * they are a labelled box with buttons that answer as PayPal's callbacks do
 * when a shopper approves, cancels or meets an error in PayPal's window.
 */

export function PayPalScriptProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

interface PayPalButtonsProps {
  onApprove?: () => Promise<void> | void;
  onCancel?: () => void;
  onError?: (error: unknown) => void;
}

export function PayPalButtons({
  onApprove,
  onCancel,
  onError,
}: PayPalButtonsProps) {
  return (
    <StandIn
      label="PayPal's buttons (stand-in: PayPal's frame does not load in a story)"
      height={150}
    >
      <span className="flex gap-2">
        <button
          type="button"
          className="underline"
          onClick={() => onApprove?.()}
        >
          Approve in PayPal
        </button>
        <button
          type="button"
          className="underline"
          onClick={() => onCancel?.()}
        >
          Cancel in PayPal
        </button>
        <button
          type="button"
          className="underline"
          onClick={() => onError?.({})}
        >
          Fail in PayPal
        </button>
      </span>
    </StandIn>
  );
}
