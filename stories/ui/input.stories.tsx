import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { userEvent } from "storybook/test";
import { Input } from "../../src/components/ui/input";

const meta = {
  title: "Storefront/UI/Input",
  component: Input,
  tags: ["CMP-SF-P-12"],
  args: {
    type: "email",
    placeholder: "you@example.com",
    "aria-label": "Email",
  },
  decorators: [
    (Story) => (
      <div className="max-w-sm">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  args: { defaultValue: "avery.quinn@example.com" },
};

export const Password: Story = {
  args: {
    type: "password",
    placeholder: "••••••••",
    defaultValue: "orchard-148",
    "aria-label": "Password",
  },
};

/** The profile form marks a refused current password this way. */
export const Invalid: Story = {
  args: { "aria-invalid": true, defaultValue: "avery.quinn@example" },
};

export const Disabled: Story = {
  args: { disabled: true, defaultValue: "avery.quinn@example.com" },
};

export const Focused: Story = {
  play: async () => {
    await userEvent.tab();
  },
};
