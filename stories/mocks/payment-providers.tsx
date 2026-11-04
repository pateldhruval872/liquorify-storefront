import type { ReactNode } from "react";
import { userEvent } from "storybook/test";

/**
 * What the payment providers' stand-ins answer, set by each story through
 * `parameters.liquorify.providers` (see server-actions.ts). Stories that show a
 * provider are labelled as mocked: the stand-ins draw a labelled box where the
 * provider's own frame or buttons go, because those load from the provider and
 * never load in a story. Nothing a stand-in shows is a claim about a provider.
 */
export interface ProviderNeeds {
  /** Which wallets the express checkout stand-in reports; `null` never reports. */
  wallets?: { applePay: boolean; googlePay: boolean; link: boolean } | null;
  /** The message a confirmation answers with, as the provider's refusal would. */
  refuseWith?: string;
}

export const providers: ProviderNeeds = {};

export function setProviderNeeds(needs: ProviderNeeds = {}) {
  providers.wallets =
    needs.wallets === undefined
      ? { applePay: true, googlePay: true, link: false }
      : needs.wallets;
  providers.refuseWith = needs.refuseWith;
}

/**
 * Presses a stand-in's button as the shopper would in the provider's frame.
 * Focus stays inside that frame on the storefront, so the stand-in gives it up
 * and the capture shows no focus outline the real page would not draw.
 */
export async function pressStandIn(button: HTMLElement) {
  await userEvent.click(button);
  button.blur();
}

/** A dashed box naming the provider's part it stands in for; a span, so a button can hold it. */
export function StandIn({
  label,
  height,
  children,
}: {
  label: string;
  height: number;
  children?: ReactNode;
}) {
  return (
    <span
      data-stand-in={label}
      style={{ minHeight: height }}
      className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-gray-400 bg-white px-4 py-3 text-center text-xs text-gray-500"
    >
      <span>{label}</span>
      {children}
    </span>
  );
}
