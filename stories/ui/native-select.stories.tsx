import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent } from "storybook/test";
import {
  NativeSelect,
  NativeSelectOptGroup,
  NativeSelectOption,
} from "../../src/components/ui/native-select";

const meta = {
  title: "Storefront/UI/Native select",
  component: NativeSelect,
  tags: ["CMP-SF-P-14"],
  args: { "aria-label": "State / Province", className: "w-64" },
  render: (args) => (
    <NativeSelect {...args}>
      <NativeSelectOption value="" disabled>
        Select a state
      </NativeSelectOption>
      <NativeSelectOption value="CA">California</NativeSelectOption>
      <NativeSelectOption value="NY">New York</NativeSelectOption>
      <NativeSelectOption value="WA">Washington</NativeSelectOption>
    </NativeSelect>
  ),
} satisfies Meta<typeof NativeSelect>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Nothing chosen yet, as the address editor opens for a new address. */
export const Placeholder: Story = { args: { defaultValue: "" } };

export const Selected: Story = { args: { defaultValue: "NY" } };

export const Small: Story = { args: { defaultValue: "NY", size: "sm" } };

/** While the states load, the address editor shows a disabled select. */
export const Disabled: Story = {
  args: { disabled: true },
  render: (args) => (
    <NativeSelect {...args}>
      <NativeSelectOption value="">Loading...</NativeSelectOption>
    </NativeSelect>
  ),
};

export const Invalid: Story = {
  args: { defaultValue: "", "aria-invalid": true },
};

export const WithGroups: Story = {
  name: "With groups",
  render: (args) => (
    <NativeSelect {...args} defaultValue="US">
      <NativeSelectOptGroup label="North America">
        <NativeSelectOption value="CA">Canada</NativeSelectOption>
        <NativeSelectOption value="US">United States</NativeSelectOption>
      </NativeSelectOptGroup>
      <NativeSelectOptGroup label="Europe">
        <NativeSelectOption value="GB">United Kingdom</NativeSelectOption>
      </NativeSelectOptGroup>
    </NativeSelect>
  ),
};

export const Focused: Story = {
  args: { defaultValue: "NY" },
  play: async () => {
    await userEvent.tab();
  },
};
