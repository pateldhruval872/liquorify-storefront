import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CircleAlert, Info } from "lucide-react";
import {
  Alert,
  AlertAction,
  AlertDescription,
  AlertTitle,
} from "../../src/components/ui/alert";
import { Button } from "../../src/components/ui/button";

const meta = {
  title: "Storefront/UI/Alert",
  component: Alert,
  tags: ["CMP-SF-P-02"],
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The only variant the account screens use: sign-in, register, password and
 * profile forms show their refusals this way. The others are the primitive's
 * own variants, with account copy.
 */
export const Destructive: Story = {
  args: {
    variant: "destructive",
    children: (
      <>
        <CircleAlert />
        <AlertDescription>Invalid email or password</AlertDescription>
      </>
    ),
  },
};

export const Default: Story = {
  args: {
    children: (
      <>
        <Info />
        <AlertTitle>Password reset successful</AlertTitle>
        <AlertDescription>
          Your password has been updated. You can now sign in with your new
          password.
        </AlertDescription>
      </>
    ),
  },
};

export const WithoutIcon: Story = {
  name: "Without icon",
  args: {
    children: <AlertDescription>Failed to save address</AlertDescription>,
  },
};

export const WithAction: Story = {
  name: "With action",
  args: {
    children: (
      <>
        <CircleAlert />
        <AlertTitle>Invalid link</AlertTitle>
        <AlertDescription>
          This reset link has expired. Please request a new one.
        </AlertDescription>
        <AlertAction>
          <Button size="xs" variant="outline">
            Request
          </Button>
        </AlertAction>
      </>
    ),
  },
};
