import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HiddenPricePrompt } from "../../src/components/products/HiddenPricePrompt";
import { HiddenPricingProvider } from "../../src/contexts/HiddenPricingContext";

/** Shown only inside the wholesale portal, which hides prices from guests. */
const meta = {
  title: "Storefront/Products/Hidden price prompt",
  component: HiddenPricePrompt,
  tags: ["CMP-SF-G-10"],
  decorators: [
    (Story) => (
      <HiddenPricingProvider
        value={{ signInHref: "/us/en/wholesale/login?redirect=%2Fus%2Fen" }}
      >
        <Story />
      </HiddenPricingProvider>
    ),
  ],
} satisfies Meta<typeof HiddenPricePrompt>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
