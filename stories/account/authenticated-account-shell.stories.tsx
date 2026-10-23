import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { getRouter } from "@storybook/nextjs-vite/navigation.mock";
import { expect, waitFor, within } from "storybook/test";
import { AuthenticatedAccountShell } from "../../src/components/account/AuthenticatedAccountShell";
import { buildAccountLoginHref } from "../../src/lib/utils/account-redirect";
import { customer } from "../fixtures/account";

const loginHref = buildAccountLoginHref("/us/en", "/us/en/account/orders");

/**
 * Guards the signed-in account pages: a skeleton while the session is
 * checked, the account shell once it is confirmed, and a redirect to sign in
 * when there is no session.
 */
const meta = {
  title: "Storefront/Account/Authenticated account shell",
  component: AuthenticatedAccountShell,
  tags: ["CMP-SF-G-01"],
  parameters: {
    layout: "fullscreen",
    liquorify: { storefront: true },
    nextjs: { navigation: { pathname: "/us/en/account/orders" } },
  },
  args: {
    loginHref,
    children: <h1 className="text-2xl font-bold text-gray-900 mb-6">Orders</h1>,
  },
} satisfies Meta<typeof AuthenticatedAccountShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SignedIn: Story = {
  name: "Signed in",
  parameters: { liquorify: { customer } },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText(customer.email),
    ).toBeVisible();
  },
};

export const CheckingSession: Story = {
  name: "Checking session",
  parameters: { liquorify: { customer: "loading" } },
};

/** The skeleton stays while the guest is sent to sign in and back. */
export const Guest: Story = {
  parameters: { liquorify: { customer: null } },
  play: async () => {
    await waitFor(() =>
      expect(getRouter().replace).toHaveBeenCalledWith(loginHref),
    );
  },
};
