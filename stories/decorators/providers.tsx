import type { Market } from "@spree/sdk";
import type { Decorator } from "@storybook/nextjs-vite";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/en.json";
import { AuthProvider } from "../../src/contexts/AuthContext";
import { CartProvider } from "../../src/contexts/CartContext";
import { StoreProvider } from "../../src/contexts/StoreContext";
import { FIXTURE_NOW } from "../fixtures/clock";
import { unitedStates } from "../fixtures/markets";

/** What a story asks of its surroundings, through `parameters.liquorify`. */
interface StoryNeeds {
  /** Mounts the store, auth and cart providers in the order the locale layout does. */
  storefront?: boolean;
  /** The markets the store sells in. Defaults to the United States alone. */
  markets?: Market[];
}

/**
 * English translations for every story, and the storefront's own providers
 * for the stories that need them, reading fixtures through the replaced
 * server actions.
 */
export const withStorefrontProviders: Decorator = (Story, context) => {
  const needs: StoryNeeds = context.parameters.liquorify ?? {};
  return (
    <NextIntlClientProvider
      locale="en"
      messages={messages}
      now={new Date(FIXTURE_NOW)}
      timeZone="UTC"
    >
      {needs.storefront ? (
        <StoreProvider
          initialCountry="us"
          initialLocale="en"
          initialMarkets={needs.markets ?? [unitedStates]}
        >
          <AuthProvider>
            <CartProvider>
              <Story />
            </CartProvider>
          </AuthProvider>
        </StoreProvider>
      ) : (
        <Story />
      )}
    </NextIntlClientProvider>
  );
};
