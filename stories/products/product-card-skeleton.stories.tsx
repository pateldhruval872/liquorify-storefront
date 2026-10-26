import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductCardSkeleton } from "../../src/components/products/ProductCardSkeleton";

/** Shown in place of each card while products load. */
const meta = {
  title: "Storefront/Products/Product card skeleton",
  component: ProductCardSkeleton,
  tags: ["CMP-SF-G-10"],
  decorators: [
    (Story) => (
      <div className="w-72">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductCardSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
