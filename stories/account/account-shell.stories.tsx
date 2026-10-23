import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { AccountShell } from "../../src/components/account/AccountShell";
import { customer, customerWithoutName } from "../fixtures/account";

/**
 * The frame of every signed-in account page: the customer's name and email,
 * the section links and Sign Out. The highlighted link follows the address.
 */
const meta = {
  title: "Storefront/Account/Account shell",
  component: AccountShell,
  tags: ["CMP-SF-G-01"],
  parameters: {
    layout: "fullscreen",
    liquorify: { storefront: true, customer },
    nextjs: { navigation: { pathname: "/us/en/account" } },
  },
  args: {
    children: (
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Account Overview
      </h1>
    ),
  },
  play: async ({ canvasElement, parameters }) => {
    const signedIn = parameters.liquorify.customer;
    await expect(
      await within(canvasElement).findByText(signedIn.email),
    ).toBeVisible();
  },
} satisfies Meta<typeof AccountShell>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Overview: Story = {};

/** An order's page highlights Orders, as every page under a section does. */
export const InASection: Story = {
  name: "In a section",
  parameters: {
    nextjs: { navigation: { pathname: "/us/en/account/orders/or_5Gk2Tn8w" } },
  },
  args: {
    children: (
      <h1 className="text-2xl font-bold text-gray-900">Order #R100000021</h1>
    ),
  },
};

/** A customer who gave no name sees "My Account" above their email. */
export const WithoutName: Story = {
  name: "Without name",
  parameters: { liquorify: { customer: customerWithoutName } },
};
