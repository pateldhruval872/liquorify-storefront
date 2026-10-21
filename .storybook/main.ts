import path from "node:path";
import type { StorybookConfig } from "@storybook/nextjs-vite";
import { mergeConfig } from "vite";

const config: StorybookConfig = {
  framework: "@storybook/nextjs-vite",
  stories: ["../stories/**/*.stories.@(ts|tsx)"],
  // Product images in the fixtures are local files, so no request leaves the page.
  staticDirs: [{ from: "../stories/fixtures/images", to: "/fixtures" }],
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
