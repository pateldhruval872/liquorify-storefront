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
  // The cart drawer loads the express checkout buttons with a dynamic import,
  // which Storybook's module mocking does not reach, and importing them
  // injects Stripe's script. The import is pointed at a stand-in instead.
  viteFinal: (viteConfig) =>
    mergeConfig(viteConfig, {
      publicDir: false,
      resolve: {
        alias: [
          {
            find: /^@\/components\/checkout\/ExpressCheckoutButton$/,
            replacement: path.resolve(
              import.meta.dirname,
              "../stories/mocks/express-checkout-button.tsx",
            ),
          },
        ],
      },
    }),
};

export default config;
