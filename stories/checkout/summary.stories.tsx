import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Summary } from "../../src/components/checkout/Summary";
import {
  addressedCart,
  couponCart,
  euroCart,
  newCheckoutCart,
  paidByGiftCardCart,
  storeCreditCart,
  taxAddedCart,
} from "../fixtures/checkout";

/** The order summary beside checkout, and above it on a phone. */
const meta = {
  title: "Storefront/Checkout/Summary",
  component: Summary,
  tags: ["CMP-SF-G-04"],
  args: { cart: addressedCart },
  decorators: [
    (Story) => (
      <div className="max-w-[360px] bg-gray-50 p-4">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof Summary>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Delivery is unknown until there is an address to rate. */
export const BeforeAnAddress: Story = {
  name: "Before an address",
  args: { cart: newCheckoutCart },
};

export const RateChosen: Story = { name: "Rate chosen" };

export const CouponApplied: Story = {
  name: "Coupon applied",
  args: { cart: couponCart },
};

/** A gift card and store credit leave less to pay than the total. */
export const GiftCardAndStoreCredit: Story = {
  name: "Gift card and store credit",
  args: { cart: storeCreditCart },
};

export const PaidByGiftCard: Story = {
  name: "Paid in full by a gift card",
  args: { cart: paidByGiftCardCart },
};

export const TaxAdded: Story = {
  name: "Tax added",
  args: { cart: taxAddedCart },
};

/** Prices in this market include tax. */
export const InEurosTaxIncluded: Story = {
  name: "In euros, tax included",
  args: { cart: euroCart },
};
