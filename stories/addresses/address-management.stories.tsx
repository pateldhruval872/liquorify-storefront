import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { AddressManagement } from "../../src/components/addresses/AddressManagement";
import { inAccountColumn } from "../decorators/account-column";
import {
  customer,
  homeAddress,
  studioAddress,
  unitedKingdom,
  unitedStatesWithStates,
} from "../fixtures/account";

const countries = [unitedStatesWithStates, unitedKingdom];
const user = {
  id: customer.id,
  email: customer.email,
  first_name: customer.first_name,
  last_name: customer.last_name,
};

/**
 * The Addresses page's list, with Add, Edit and Delete. Adding and editing
 * open the address editor; deleting asks first.
 */
const meta = {
  title: "Storefront/Addresses/Address management",
  component: AddressManagement,
  tags: ["CMP-SF-G-02"],
  parameters: { layout: "fullscreen", liquorify: { countries } },
  args: {
    initialAddresses: [homeAddress, studioAddress],
    countries,
    showAddButton: true,
    emptyState: false,
    user,
  },
  decorators: [inAccountColumn],
} satisfies Meta<typeof AddressManagement>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AddressesListed: Story = { name: "Addresses listed" };

/** With no addresses the page shows only this button, inside its empty state. */
export const NoAddresses: Story = {
  name: "No addresses",
  args: { initialAddresses: [], emptyState: true },
};

/** A new address starts with the customer's name filled in. */
export const Adding: Story = {
  parameters: { liquorify: { capture: "viewport" } },
  play: async ({ canvasElement }) => {
    await userEvent.click(
      within(canvasElement).getByRole("button", { name: "Add Address" }),
    );
    await expect(
      await within(document.body).findByRole("dialog", {
        name: "Add New Address",
      }),
    ).toBeVisible();
  },
};

export const Editing: Story = {
  parameters: { liquorify: { capture: "viewport" } },
  play: async ({ canvasElement }) => {
    const [firstEdit] = within(canvasElement).getAllByRole("button", {
      name: "Edit",
    });
    await userEvent.click(firstEdit);
    const dialog = await within(document.body).findByRole("dialog", {
      name: "Edit Address",
    });
    await expect(
      await within(dialog).findByRole("option", { name: "New York" }),
    ).toBeInTheDocument();
  },
};

/** Spree refuses the change and the editor shows its message. */
export const SaveRefused: Story = {
  name: "Save refused",
  parameters: {
    layout: "fullscreen",
    liquorify: { capture: "viewport", failWith: "Zip Code is invalid" },
  },
  play: async ({ canvasElement }) => {
    const [firstEdit] = within(canvasElement).getAllByRole("button", {
      name: "Edit",
    });
    await userEvent.click(firstEdit);
    const dialog = within(
      await within(document.body).findByRole("dialog", {
        name: "Edit Address",
      }),
    );
    await dialog.findByRole("option", { name: "New York" });
    await userEvent.click(dialog.getByRole("button", { name: "Save Address" }));
    await expect(await dialog.findByRole("alert")).toHaveTextContent(
      "Zip Code is invalid",
    );
  },
};

export const DeleteConfirmation: Story = {
  name: "Delete confirmation",
  parameters: { liquorify: { capture: "viewport" } },
  play: async ({ canvasElement }) => {
    const [firstDelete] = within(canvasElement).getAllByRole("button", {
      name: "Delete",
    });
    await userEvent.click(firstDelete);
    await expect(
      await within(document.body).findByRole("alertdialog"),
    ).toBeVisible();
  },
};
