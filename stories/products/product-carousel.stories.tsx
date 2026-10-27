import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductCarousel } from "../../src/components/products/ProductCarousel";
import { featuredProducts } from "../fixtures/catalog";

const meta = {
  title: "Storefront/Products/Product carousel",
  component: ProductCarousel,
  tags: ["CMP-SF-G-10"],
  args: { products: featuredProducts, basePath: "/us/en", currency: "USD" },
  decorators: [
    (Story) => (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductCarousel>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Eight products: one card at a phone's width, four at a desktop's. */
export const Default: Story = {};

export const NoProducts: Story = {
  name: "No products",
  args: { products: [] },
};
