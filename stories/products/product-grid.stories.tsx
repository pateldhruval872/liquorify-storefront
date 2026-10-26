import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductGrid } from "../../src/components/products/ProductGrid";
import { firstPageOfProducts } from "../fixtures/shop";

/**
 * A plain grid of product cards. No screen uses it at storefront `321fa1c`;
 * the product lists use the infinite product list instead. The stories show
 * what it draws with and without products, and claim no screen.
 */
const meta = {
  title: "Storefront/Products/Product grid",
  component: ProductGrid,
  tags: ["CMP-SF-G-10"],
  args: { products: firstPageOfProducts.slice(0, 6), basePath: "/us/en" },
} satisfies Meta<typeof ProductGrid>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithProducts: Story = {
  name: "With products",
};

export const Empty: Story = {
  args: { products: [], emptyMessage: "No products found" },
};
