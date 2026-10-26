import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductGridSkeleton } from "../../src/components/products/ProductGridSkeleton";

/** Six card skeletons, in two columns on a phone and three on a desktop. */
const meta = {
  title: "Storefront/Products/Product grid skeleton",
  component: ProductGridSkeleton,
  tags: ["CMP-SF-G-10"],
} satisfies Meta<typeof ProductGridSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
