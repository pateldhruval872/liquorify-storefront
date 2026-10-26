import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FilterBarSkeleton } from "../../../src/components/products/filters";

/** The filter bar's place while the product list loads. */
const meta = {
  title: "Storefront/Products/Filters/Filter bar skeleton",
  component: FilterBarSkeleton,
  tags: ["CMP-SF-G-10"],
} satisfies Meta<typeof FilterBarSkeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
