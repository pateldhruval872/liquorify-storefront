import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FeaturedProductsSection } from "../../src/components/home/FeaturedProductsSection";
import { featuredProducts } from "../fixtures/catalog";

const meta = {
  title: "Storefront/Home/Featured products section",
  component: FeaturedProductsSection,
  tags: ["CMP-SF-G-05"],
  parameters: { layout: "fullscreen" },
  args: { basePath: "/us/en", locale: "en", country: "us", currency: "USD" },
} satisfies Meta<typeof FeaturedProductsSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  parameters: { liquorify: { products: featuredProducts } },
};

export const Loading: Story = {
  parameters: { liquorify: { products: "loading" } },
};

export const NoProducts: Story = {
  name: "No products",
  parameters: { liquorify: { products: [] } },
};
