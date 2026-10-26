import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CurrentYear } from "../../src/components/layout/CurrentYear";

/** The year in the footer's copyright line, read from the shopper's clock. */
const meta = {
  title: "Storefront/Layout/Current year",
  component: CurrentYear,
  tags: ["CMP-SF-G-06"],
} satisfies Meta<typeof CurrentYear>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
