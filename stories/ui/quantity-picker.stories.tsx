import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { expect, userEvent, within } from "storybook/test";
import { QuantityPicker } from "../../src/components/ui/quantity-picker";

/**
 * The small size is the cart's and the large size the product page's. The
 * minus button is disabled at one; there is no upper limit.
 */
const meta = {
  title: "Storefront/UI/Quantity picker",
  component: QuantityPicker,
  tags: ["CMP-SF-P-17"],
  args: {
    quantity: 1,
    onQuantityChange: () => {},
    decrementLabel: "Decrease quantity",
    incrementLabel: "Increase quantity",
    quantityLabel: "Quantity",
  },
  render: function Render(args) {
    const [quantity, setQuantity] = useState(args.quantity);
    return (
      <div className="inline-flex">
        <QuantityPicker
          {...args}
          quantity={quantity}
          onQuantityChange={setQuantity}
        />
      </div>
    );
  },
} satisfies Meta<typeof QuantityPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Small: Story = {};

export const Large: Story = {
  args: { size: "lg" },
};

export const MoreThanOne: Story = {
  name: "More than one",
  args: { quantity: 3 },
};

export const Disabled: Story = {
  args: { quantity: 2, disabled: true },
};

/** Typing a number and leaving the field sets it; letters are dropped as they are typed. */
export const Typed: Story = {
  args: { size: "lg" },
  play: async ({ canvasElement }) => {
    const field = within(canvasElement).getByRole("textbox", {
      name: "Quantity",
    });
    await userEvent.clear(field);
    await userEvent.type(field, "1a2");
    await userEvent.tab();
    await expect(field).toHaveValue("12");
  },
};
