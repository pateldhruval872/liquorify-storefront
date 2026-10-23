import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Checkbox } from "../../src/components/ui/checkbox";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
} from "../../src/components/ui/field";
import { Input } from "../../src/components/ui/input";

const meta = {
  title: "Storefront/UI/Field",
  component: Field,
  tags: ["CMP-SF-P-10"],
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Field>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A label above its input, as on every account form. */
export const Default: Story = {
  render: () => (
    <Field>
      <FieldLabel htmlFor="email">Email</FieldLabel>
      <Input type="email" id="email" placeholder="you@example.com" />
    </Field>
  ),
};

export const WithDescription: Story = {
  name: "With description",
  render: () => (
    <Field>
      <FieldLabel htmlFor="current_password">Current Password</FieldLabel>
      <Input type="password" id="current_password" placeholder="••••••••" />
      <FieldDescription>
        Confirm your current password to change your email address.
      </FieldDescription>
    </Field>
  ),
};

export const WithError: Story = {
  name: "With error",
  render: () => (
    <Field data-invalid>
      <FieldLabel htmlFor="password">Password</FieldLabel>
      <Input type="password" id="password" defaultValue="abc" aria-invalid />
      <FieldError>Password must be at least 6 characters</FieldError>
    </Field>
  ),
};

export const Disabled: Story = {
  render: () => (
    <Field data-disabled>
      <FieldLabel htmlFor="email-disabled">Email</FieldLabel>
      <Input
        type="email"
        id="email-disabled"
        defaultValue="avery.quinn@example.com"
        disabled
      />
    </Field>
  ),
};

export const Horizontal: Story = {
  render: () => (
    <Field orientation="horizontal">
      <Checkbox id="same-as-shipping" defaultChecked />
      <FieldContent>
        <FieldLabel htmlFor="same-as-shipping">
          Same as shipping address
        </FieldLabel>
        <FieldDescription>
          Addresses you add during checkout will appear here.
        </FieldDescription>
      </FieldContent>
    </Field>
  ),
};

/** Two names side by side, then the email, as the register form groups them. */
export const Group: Story = {
  render: () => (
    <FieldSet>
      <FieldLegend>Create Account</FieldLegend>
      <FieldGroup>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="firstName">First name</FieldLabel>
            <Input id="firstName" placeholder="John" />
          </Field>
          <Field>
            <FieldLabel htmlFor="lastName">Last name</FieldLabel>
            <Input id="lastName" placeholder="Doe" />
          </Field>
        </div>
        <FieldSeparator>or</FieldSeparator>
        <Field>
          <FieldLabel htmlFor="group-email">Email</FieldLabel>
          <Input id="group-email" placeholder="you@example.com" />
        </Field>
      </FieldGroup>
    </FieldSet>
  ),
};
