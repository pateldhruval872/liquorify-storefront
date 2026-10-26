import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { QuantityPickerField } from "../../src/components/cart/QuantityPickerField";

/**
 * The quantity picker with the storefront's own labels, as the product page
 * uses it. The cart's use of it stays with batch 9.
 */
const meta = {
  title: "Storefront/Cart/Quantity picker field",
  component: QuantityPickerField,
  tags: ["CMP-SF-G-03"],
  args: { quantity: 1, onQuantityChange: () => {}, size: "lg" },
  render: function Render(args) {
    const [quantity, setQuantity] = useState(args.quantity);
    return (
      <div className="inline-flex">
        <QuantityPickerField
          {...args}
          quantity={quantity}
          onQuantityChange={setQuantity}
        />
      </div>
    );
  },
} satisfies Meta<typeof QuantityPickerField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OnTheProductPage: Story = {
  name: "On the product page",
};
