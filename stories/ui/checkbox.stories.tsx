import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { Checkbox } from "../../src/components/ui/checkbox";

const meta = {
  title: "Storefront/UI/Checkbox",
  component: Checkbox,
  tags: ["CMP-SF-P-07"],
  args: { "aria-label": "Accept" },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

/** The register page marks a missing policy consent with a red border. */
export const Invalid: Story = { args: { className: "border-red-500" } };

export const Disabled: Story = { args: { disabled: true } };

export const DisabledChecked: Story = {
  name: "Disabled checked",
  args: { disabled: true, defaultChecked: true },
};

/**
 * The checkbox has keyboard focus here, but the storefront's checkbox draws
 * no focus ring, so it looks the same as Unchecked.
 */
export const FocusVisible: Story = {
  name: "Focus visible",
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(within(canvasElement).getByRole("checkbox")).toHaveFocus();
  },
};
