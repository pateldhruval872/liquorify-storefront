import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductCustomFields } from "../../src/components/products/ProductCustomFields";
import { overshirtCustomFields } from "../fixtures/shop";

/**
 * The product's custom fields that staff chose to show on the storefront,
 * under Properties. A yes-or-no field reads Yes or No; rich text keeps its
 * formatting. A product without any shows nothing.
 */
const meta = {
  title: "Storefront/Products/Product custom fields",
  component: ProductCustomFields,
  tags: ["CMP-SF-G-10"],
  args: { customFields: overshirtCustomFields },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductCustomFields>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneOfEachKind: Story = {
  name: "One of each kind",
};
