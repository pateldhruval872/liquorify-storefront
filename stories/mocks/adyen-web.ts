import { providers } from "./payment-providers";

/**
 * Stands in for `@adyen/adyen-web` in every story (`.storybook/main.ts`).
 * Adyen's Drop-in loads its payment methods from Adyen; here it mounts a
 * labelled box into the node the storefront gives it, and a submit answers
 * with Adyen's refusal when the story asks for one, through the same callback
 * Adyen calls.
 */

interface CheckoutConfiguration {
  onPaymentCompleted?: (result: {
    resultCode: string;
    sessionResult?: string;
  }) => void;
  onPaymentFailed?: (result: { resultCode: string }) => void;
}

class PaymentMethodComponent {}

export class Card extends PaymentMethodComponent {}
export class GooglePay extends PaymentMethodComponent {}
export class ApplePay extends PaymentMethodComponent {}
export class PayPal extends PaymentMethodComponent {}
export class Klarna extends PaymentMethodComponent {}
export class Bancontact extends PaymentMethodComponent {}
export class Redirect extends PaymentMethodComponent {}

export async function AdyenCheckout(configuration: CheckoutConfiguration) {
  return configuration;
}
AdyenCheckout.register = (..._components: unknown[]) => {};

export class Dropin {
  private node: HTMLElement | null = null;

  constructor(private readonly checkout: CheckoutConfiguration) {}

  mount(node: HTMLElement) {
    this.node = node;
    node.innerHTML = `<div data-stand-in="Adyen Drop-in" style="min-height:260px" class="flex flex-col items-center justify-center rounded-md border border-dashed border-gray-400 bg-white px-4 py-3 text-center text-xs text-gray-500">Adyen's Drop-in (stand-in: Adyen's payment methods do not load in a story)</div>`;
    return this;
  }

  submit() {
    if (providers.refuseWith) {
      this.checkout.onPaymentFailed?.({ resultCode: providers.refuseWith });
    } else {
      this.checkout.onPaymentCompleted?.({
        resultCode: "Authorised",
        sessionResult: "stand-in-result",
      });
    }
  }

  unmount() {
    if (this.node) this.node.innerHTML = "";
  }
}
