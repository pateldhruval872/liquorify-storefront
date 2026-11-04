import type { State } from "@spree/sdk";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { AddressSection } from "../../src/components/checkout/AddressSection";
import { customer } from "../fixtures/account";
import {
  addressedCart,
  addressRequirement,
  checkoutCountries,
  newCheckoutCart,
  savedAddresses,
} from "../fixtures/checkout";

async function statesOf(iso: string): Promise<State[]> {
  return checkoutCountries.find((country) => country.iso === iso)?.states ?? [];
}

const signedIn = {
  isAuthenticated: true,
  user: {
    id: customer.id,
    email: customer.email,
    first_name: customer.first_name,
    last_name: customer.last_name,
  },
};

/**
 * Checkout's contact and shipping address. A guest types an email and an
 * address, saved to the cart when focus leaves the form; a signed-in customer
 * picks one of their saved addresses or types another.
 */
const meta = {
  title: "Storefront/Checkout/Address section",
  component: AddressSection,
  tags: ["CMP-SF-G-04"],
  args: {
    cart: newCheckoutCart,
    countries: checkoutCountries,
    savedAddresses: [],
    isAuthenticated: false,
    signInUrl: "/us/en/account?redirect=%2Fus%2Fen%2Fcheckout%2Fcart_8Wd3Kq6n",
    fetchStates: statesOf,
    onEmailBlur: fn(async () => {}),
    onAutoSave: fn(async () => {}),
    user: null,
  },
  decorators: [
    (Story) => (
      <div className="max-w-[560px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AddressSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A guest on arrival: the market's first country is chosen for them. */
export const GuestEmpty: Story = {
  name: "Guest, nothing entered",
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("option", { name: "New York" });
  },
};

export const GuestFilled: Story = {
  name: "Guest, address saved",
  args: { cart: addressedCart },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("option", { name: "New York" });
  },
};

export const Saving: Story = {
  args: { cart: addressedCart, saving: true },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("option", { name: "New York" });
  },
};

/** "Pay now" found the address missing, from the cart's requirements. */
export const AddressMissing: Story = {
  name: "Address missing",
  args: { errors: [addressRequirement.message] },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("option", { name: "New York" });
  },
};

/** The first saved address is chosen and saved to the cart on arrival. */
export const SignedInWithSavedAddresses: Story = {
  name: "Signed in, saved addresses",
  args: {
    ...signedIn,
    savedAddresses,
    onUpdateSavedAddress: fn(async () => null),
  },
};

/** The email is the account's and cannot be changed here. */
export const SignedInWithoutSavedAddresses: Story = {
  name: "Signed in, no saved addresses",
  args: signedIn,
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("option", { name: "New York" });
  },
};

/** "Edit" on a saved address opens the address editor over checkout. */
export const EditingSavedAddress: Story = {
  name: "Editing a saved address",
  parameters: { layout: "fullscreen", liquorify: { capture: "viewport" } },
  args: {
    ...signedIn,
    savedAddresses,
    onUpdateSavedAddress: fn(async () => null),
  },
  play: async ({ canvasElement }) => {
    const [edit] = await within(canvasElement).findAllByRole("button", {
      name: "Edit",
    });
    await userEvent.click(edit);
    const dialog = await within(document.body).findByRole("dialog");
    await within(dialog).findByRole("option", { name: "New York" });
    await expect(dialog).toBeVisible();
  },
};
