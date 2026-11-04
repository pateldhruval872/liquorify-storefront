/**
 * Stands in for `@/lib/utils/payment-gateway` in every story
 * (`.storybook/main.ts`): the gateway map is the storefront's own, and Adyen
 * and PayPal read as configured, with invented values that look like no real
 * key, so their forms render. Without a key each form renders nothing.
 */
export { resolveGatewayId } from "../../src/lib/utils/payment-gateway";

export const isPayPalConfigured = true;
export const paypalClientId = "stand-in-paypal-client";
export const isAdyenConfigured = true;
export const adyenClientKey = "stand-in-adyen-client";
export const adyenEnvironment: "test" | "live" = "test";
