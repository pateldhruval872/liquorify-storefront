import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { AddressFormFields } from "../../src/components/checkout/AddressFormFields";
import { addressToFormData, emptyAddress } from "../../src/lib/utils/address";
import {
  homeAddress,
  unitedKingdom,
  unitedStatesWithStates,
} from "../fixtures/account";

/**
 * The address inputs shared by the address editor and checkout's billing
 * address. The state input depends on the country: a list when the country
 * has states, a text box when it has none, and a disabled list while loading.
 */
const meta = {
  title: "Storefront/Checkout/Address form fields",
  component: AddressFormFields,
  tags: ["CMP-SF-G-04"],
  args: {
    address: emptyAddress,
    countries: [unitedStatesWithStates, unitedKingdom],
    states: [],
    loadingStates: false,
    onChange: fn(),
    idPrefix: "story",
  },
  decorators: [
    (Story) => (
      <div className="max-w-lg">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof AddressFormFields>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Filled: Story = {
  args: {
    address: addressToFormData(homeAddress),
    states: unitedStatesWithStates.states,
  },
};

export const LoadingStates: Story = {
  name: "Loading states",
  args: { address: addressToFormData(homeAddress), loadingStates: true },
};

export const CountryWithoutStates: Story = {
  name: "Country without states",
  args: {
    address: {
      ...emptyAddress,
      country_code: "GB",
      state_name: "Greater London",
    },
  },
};
