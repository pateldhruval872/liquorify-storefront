import path from "node:path";
import type { StorybookConfig } from "@storybook/nextjs-vite";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  // Every image is served locally, so no request leaves the page. Next.js
  // serves the logo resized for its slot and Storybook serves files as they
  // are, so the logo is the copy Next.js serves to a 1x screen; the public
  // folder is therefore not served whole (publicDir below).
  staticDirs: [
    { from: "../public/flags", to: "/flags" },
    { from: "../stories/fixtures/public", to: "/" },
    { from: "../stories/fixtures/images", to: "/fixtures" },
  ],
  core: { disableTelemetry: true },
  // Renders async server components such as HeroSection in the browser.
  features: { experimentalRSC: true },
  // Story names are the states (LIQ-010 §10); prop tables are not needed.
  typescript: { reactDocgen: false },
  // The cart drawer, the cart page and checkout load the express checkout
  // buttons with a dynamic import, which Storybook's module mocking does not
  // reach. The import is pointed at a stand-in that shows nothing, as the
  // running storefront does without a Stripe key. The payment providers'
  // libraries load the providers' own scripts and frames, so they are pointed
  // at labelled stand-ins too (stories/mocks/payment-providers.tsx); the
  // express checkout stories import the real buttons by their file path.
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      publicDir: false,
      resolve: {
        alias: [
          [
            /^@\/components\/checkout\/ExpressCheckoutButton$/,
            "express-checkout-button.tsx",
          ],
          [/^@stripe\/react-stripe-js$/, "stripe-react-stripe-js.tsx"],
          [/^@\/lib\/utils\/stripe$/, "stripe-utils.ts"],
          [/^@\/lib\/utils\/payment-gateway$/, "payment-gateway.ts"],
          [/^@adyen\/adyen-web$/, "adyen-web.ts"],
          [/^@paypal\/react-paypal-js$/, "paypal-react-paypal-js.tsx"],
        ].map(([find, standIn]) => ({
          find,
          replacement: path.resolve(
            import.meta.dirname,
            "../stories/mocks",
            standIn as string,
          ),
        })),
      },
    }),
};

export default config;
