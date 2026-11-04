import type { Address } from "@spree/sdk";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { fn, within } from "storybook/test";
import { AddressSelector } from "../../src/components/checkout/AddressSelector";
import {
  type AddressFormData,
  addressToFormData,
  emptyAddress,
} from "../../src/lib/utils/address";
import { customer } from "../fixtures/account";
import { checkoutCountries, savedAddresses } from "../fixtures/checkout";

const states = checkoutCountries[0].states ?? [];

/** The selector with the address state AddressSection keeps for it. */
function SelectorWithAddress({
  initial,
  editable,
}: {
  initial: AddressFormData;
  editable: boolean;
}) {
  const [current, setCurrent] = useState(initial);
  return (
    <div className="max-w-[560px]">
      <AddressSelector
        savedAddresses={savedAddresses}
        currentAddress={current}
        countries={checkoutCountries}
        states={states}
        loadingStates={false}
        onChange={(field, value) =>
          setCurrent((previous) => ({ ...previous, [field]: value }))
        }
        onSelectSavedAddress={(address: Address) =>
          setCurrent(addressToFormData(address))
        }
        onEditAddress={editable ? fn() : undefined}
        idPrefix="ship"
        user={customer}
      />
    </div>
  );
}

/**
 * A signed-in customer's saved addresses, chosen with a radio button, and a
 * last choice that opens the address form for another address.
 */
const meta = {
  title: "Storefront/Checkout/Address selector",
  component: SelectorWithAddress,
  tags: ["CMP-SF-G-04"],
  args: { initial: addressToFormData(savedAddresses[0]), editable: true },
} satisfies Meta<typeof SelectorWithAddress>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SavedAddressChosen: Story = { name: "Saved address chosen" };

/** Choosing "Use a different address" empties the form but keeps the customer's name. */
export const DifferentAddress: Story = {
  name: "Different address",
  args: {
    initial: {
      ...emptyAddress,
      first_name: customer.first_name ?? "",
      last_name: customer.last_name ?? "",
      country_code: "US",
    },
  },
  play: async ({ canvasElement }) => {
    await within(canvasElement).findByRole("option", { name: "New York" });
  },
};

/** Without an address editor, as when the page offers no way to save one. */
export const WithoutEditing: Story = {
  name: "Without editing",
  args: { initial: addressToFormData(savedAddresses[1]), editable: false },
};
