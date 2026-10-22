import type { State } from "@spree/sdk";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { AddressEditModal } from "../../src/components/checkout/AddressEditModal";
import {
  customer,
  studioAddress,
  unitedKingdom,
  unitedStatesWithStates,
} from "../fixtures/account";

const countries = [unitedStatesWithStates, unitedKingdom];

async function statesOf(iso: string): Promise<State[]> {
  return countries.find((country) => country.iso === iso)?.states ?? [];
}

/**
 * The address editor, opened by the Addresses page and by checkout. It loads
 * the chosen country's states and shows Spree's refusal when a save fails.
 */
const meta = {
  title: "Storefront/Checkout/Address edit modal",
  component: AddressEditModal,
  tags: ["CMP-SF-G-04"],
  parameters: { layout: "fullscreen", liquorify: { capture: "viewport" } },
  args: {
    address: null,
    countries,
    fetchStates: statesOf,
    onSave: async () => {},
    onClose: fn(),
    user: {
      id: customer.id,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
    },
  },
} satisfies Meta<typeof AddressEditModal>;

export default meta;
type Story = StoryObj<typeof meta>;

/** A new address, with the customer's name filled in and no country chosen. */
export const Adding: Story = {};

export const Editing: Story = {
  args: { address: studioAddress },
  play: async () => {
    await within(document.body).findByRole("option", { name: "California" });
  },
};

/** A country without states in the database asks for the region as text. */
export const CountryWithoutStates: Story = {
  name: "Country without states",
  args: {
    address: {
      ...studioAddress,
      country_code: "GB",
      state_code: null,
      state_name: "Greater London",
      city: "London",
      postal_code: "EC1V 9HX",
      address1: "40 Bowling Green Lane",
      address2: null,
    },
  },
};

/**
 * While the states load, the editor shows the text box for a region, not the
 * disabled "Loading..." list: the hook's loading flag ends as soon as the
 * request starts, because the transition does not wait for it.
 */
export const WhileStatesLoad: Story = {
  name: "While states load",
  args: { address: studioAddress, fetchStates: () => new Promise(() => {}) },
};

export const Saving: Story = {
  args: { address: studioAddress, onSave: () => new Promise(() => {}) },
  play: async () => {
    const body = within(document.body);
    await body.findByRole("option", { name: "California" });
    await userEvent.click(body.getByRole("button", { name: "Save Address" }));
    await expect(
      body.getByRole("button", { name: "Saving..." }),
    ).toBeDisabled();
  },
};

export const SaveRefused: Story = {
  name: "Save refused",
  args: {
    address: studioAddress,
    onSave: async () => {
      throw new Error("Zip Code is invalid");
    },
  },
  play: async () => {
    const body = within(document.body);
    await body.findByRole("option", { name: "California" });
    await userEvent.click(body.getByRole("button", { name: "Save Address" }));
    await expect(await body.findByRole("alert")).toHaveTextContent(
      "Zip Code is invalid",
    );
  },
};
