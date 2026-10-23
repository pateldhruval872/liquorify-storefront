import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { PaymentInfo } from "../../src/components/order/PaymentInfo";
import {
  amexCard,
  cardPayment,
  checkPayment,
  storeCreditPayment,
} from "../fixtures/account";

/**
 * How an order names one payment. A gift card is redeemed as store credit,
 * so a store credit payment equal to the order's gift card total is named as
 * the gift card.
 */
const meta = {
  title: "Storefront/Order/Payment info",
  component: PaymentInfo,
  tags: ["CMP-SF-G-08"],
  args: { payment: cardPayment("py_5Gk2Tn8w", "73.00"), currency: "USD" },
} satisfies Meta<typeof PaymentInfo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Card: Story = {};

export const OtherCardBrand: Story = {
  name: "Other card brand",
  args: { payment: cardPayment("py_1Hc6Vz9p", "73.00", amexCard) },
};

export const GiftCard: Story = {
  name: "Gift card",
  args: {
    payment: storeCreditPayment("py_3Wp9Ls1d", "37.00", "13.00"),
    giftCardTotal: "37.00",
  },
};

export const StoreCredit: Story = {
  name: "Store credit",
  args: { payment: storeCreditPayment("py_4Hs8Qe1n", "10.00", "15.00") },
};

/** A method without a saved source, such as a check, shows its name and amount. */
export const OtherMethod: Story = {
  name: "Other method",
  args: { payment: checkPayment("py_1Rx6Fm9b", "68.00") },
};
