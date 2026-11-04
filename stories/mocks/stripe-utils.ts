import { standInStripe } from "./stripe-react-stripe-js";

/**
 * Stands in for `@/lib/utils/stripe` in every story (`.storybook/main.ts`),
 * as if a publishable key were set, without loading Stripe's script. Only the
 * express checkout and Stripe form stories reach it: the cart drawer, the cart
 * page and checkout load the express checkout buttons through their own
 * stand-in, which shows nothing, as the running storefront does without a key.
 */
export const isStripeConfigured = true;

export const stripePromise = Promise.resolve(standInStripe);
