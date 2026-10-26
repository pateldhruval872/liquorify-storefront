import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductListingSkeleton } from "../../src/components/products/ProductListingSkeleton";

/** The product list's place while its first page loads: the filter bar's skeleton and six cards'. */
const meta = {
  title: "Storefront/Products/Product listing skeleton",
  component: ProductListingSkeleton,
  tags: ["CMP-SF-G-10"],
} satisfies Meta<typeof ProductListingSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
