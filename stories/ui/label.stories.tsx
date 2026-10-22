import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Checkbox } from "../../src/components/ui/checkbox";
import { Label } from "../../src/components/ui/label";

const meta = {
  title: "Storefront/UI/Label",
  component: Label,
  tags: ["CMP-SF-P-13"],
  args: { children: "Email", htmlFor: "email" },
} satisfies Meta<typeof Label>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithCheckbox: Story = {
  name: "With checkbox",
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="same-as-shipping" />
      <Label htmlFor="same-as-shipping">Same as shipping address</Label>
    </div>
  ),
};

/** A label after a disabled control fades with it. */
export const Disabled: Story = {
  render: () => (
    <div className="flex items-center gap-2">
      <Checkbox id="same-as-shipping-disabled" disabled />
      <Label htmlFor="same-as-shipping-disabled">
        Same as shipping address
      </Label>
    </div>
  ),
};
