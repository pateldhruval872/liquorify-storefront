import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FeaturedProducts } from "../../src/components/products/FeaturedProducts";
import { featuredProducts } from "../fixtures/catalog";

/** Asks the Store API for eight products and shows them in the carousel. */
const meta = {
  title: "Storefront/Products/Featured products",
  component: FeaturedProducts,
  tags: ["CMP-SF-G-10"],
  parameters: { liquorify: { products: featuredProducts } },
  args: { basePath: "/us/en", locale: "en", country: "us", currency: "USD" },
  decorators: [
    (Story) => (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof FeaturedProducts>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
