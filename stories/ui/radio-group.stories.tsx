import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import {
  RadioGroup,
  RadioGroupItem,
} from "../../src/components/ui/radio-group";

/** Checkout's choices of delivery rate, payment method and saved card. */
function Choices({ value, disabled }: { value?: string; disabled?: boolean }) {
  return (
    <RadioGroup
      defaultValue={value}
      disabled={disabled}
      aria-label="Delivery"
      className="max-w-xs"
    >
      {["Standard", "Express"].map((name) => (
        <label key={name} className="flex items-center gap-3 text-sm">
          <RadioGroupItem value={name} />
          {name}
        </label>
      ))}
    </RadioGroup>
  );
}

const meta = {
  title: "Storefront/UI/Radio group",
  component: Choices,
  tags: ["CMP-SF-P-18"],
} satisfies Meta<typeof Choices>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoneChosen: Story = { name: "None chosen" };

export const Chosen: Story = { args: { value: "Standard" } };

/** Checkout disables the choices while a write is in progress. */
export const Disabled: Story = { args: { value: "Standard", disabled: true } };

/**
 * The chosen item has keyboard focus here, but the storefront's radio item
 * draws no focus ring, so it looks the same as Chosen.
 */
export const FocusVisible: Story = {
  name: "Focus visible",
  args: { value: "Standard" },
  play: async ({ canvasElement }) => {
    await userEvent.tab();
    await expect(
      within(canvasElement).getByRole("radio", { name: "Standard" }),
    ).toHaveFocus();
  },
};
