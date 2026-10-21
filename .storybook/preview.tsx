import type { Preview } from "@storybook/nextjs-vite";
import { Geist } from "next/font/google";
import { sb } from "storybook/test";
import "../src/app/globals.css";
import { withStorefrontProviders } from "../stories/decorators/providers";
import { mockServerActions } from "../stories/mocks/server-actions";

// Server actions and server-only modules are replaced for every story; each
// story gives them fixtures through mockServerActions.
sb.mock(import("../src/lib/data/cart.ts"));
sb.mock(import("../src/lib/data/customer.ts"));
sb.mock(import("next-intl/server"));

// The same font loader call as DocumentShell, applied to the body as it is there.
const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
  display: "swap",
});
document.body.classList.add(geist.variable, "antialiased");

const preview: Preview = {
  decorators: [withStorefrontProviders],
  beforeEach({ parameters }) {
    mockServerActions(parameters.liquorify ?? {});
  },
  parameters: {
    layout: "padded",
    nextjs: {
      appDirectory: true,
      navigation: { pathname: "/us/en" },
    },
  },
};

export default preview;
