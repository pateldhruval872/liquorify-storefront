import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { PolicyConsent } from "../../src/components/policy/PolicyConsent";

/** The consent to the store's policies that registering requires. */
const meta = {
  title: "Storefront/Policy/Policy consent",
  component: PolicyConsent,
  tags: ["CMP-SF-G-09"],
  parameters: {
    nextjs: { navigation: { pathname: "/us/en/account/register" } },
  },
  args: { checked: false, onCheckedChange: () => {}, error: false },
  render: function Render(args) {
    const [checked, setChecked] = useState(args.checked);
    return (
      <div className="max-w-md">
        <PolicyConsent
          {...args}
          checked={checked}
          onCheckedChange={setChecked}
        />
      </div>
    );
  },
} satisfies Meta<typeof PolicyConsent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Unchecked: Story = {};

export const Checked: Story = { args: { checked: true } };

/** After submitting without consent, the register page marks it in red. */
export const Required: Story = { args: { error: true } };
