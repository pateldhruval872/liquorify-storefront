import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductCard } from "../../src/components/products/ProductCard";
import { HiddenPricingProvider } from "../../src/contexts/HiddenPricingContext";
import {
  glassCarafe,
  productWithHiddenPrice,
  stonewareMug,
  stovetopKettle,
  tableLamp,
  woolThrow,
} from "../fixtures/catalog";

const meta = {
  title: "Storefront/Products/Product card",
  component: ProductCard,
  tags: ["CMP-SF-G-10"],
  args: { product: stonewareMug, basePath: "/us/en" },
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const OnSale: Story = {
  name: "On sale",
  args: { product: tableLamp },
};

export const SoldOut: Story = {
  name: "Sold out",
  args: { product: stovetopKettle },
};

/** A product with no picture shows the placeholder; a long name wraps to two lines. */
export const NoPictureLongName: Story = {
  name: "No picture, long name",
  args: { product: woolThrow },
};

export const OnSaleNoPicture: Story = {
  name: "On sale, no picture",
  args: { product: glassCarafe },
};

/** On the storefront a withheld price leaves the price line empty. */
export const PriceWithheld: Story = {
  name: "Price withheld",
  args: { product: productWithHiddenPrice },
};

/** Inside the wholesale portal a withheld price asks the buyer to sign in. */
export const PriceWithheldInWholesale: Story = {
  name: "Price withheld in wholesale",
  args: { product: productWithHiddenPrice },
  decorators: [
    (Story) => (
      <HiddenPricingProvider
        value={{ signInHref: "/us/en/wholesale/login?redirect=%2Fus%2Fen" }}
      >
        <Story />
      </HiddenPricingProvider>
    ),
  ],
};
