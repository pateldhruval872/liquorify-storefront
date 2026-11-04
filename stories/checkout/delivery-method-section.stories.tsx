import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import { DeliveryMethodSection } from "../../src/components/checkout/DeliveryMethodSection";
import {
  deliveryRequirement,
  euroCart,
  oneShipment,
  twoShipments,
} from "../fixtures/checkout";

/**
 * Checkout's delivery rates, one group for each shipment Spree splits the
 * cart into. Choosing a rate saves it to the cart straight away.
 */
const meta = {
  title: "Storefront/Checkout/Delivery method section",
  component: DeliveryMethodSection,
  tags: ["CMP-SF-G-04"],
  args: {
    fulfillments: [oneShipment],
    currency: "USD",
    onDeliveryRateSelect: fn(async () => {}),
    processing: false,
  },
  decorators: [
    (Story) => (
      <div className="max-w-[560px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof DeliveryMethodSection>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Spree has no shipments to rate until the cart has an address. */
export const BeforeAnAddress: Story = {
  name: "Before an address",
  args: { fulfillments: [] },
};

export const OneShipment: Story = { name: "One shipment" };

/** Items stocked in two places ship separately, each from its own location. */
export const TwoShipments: Story = {
  name: "Two shipments",
  args: { fulfillments: twoShipments },
};

/** While another write is in progress the rates cannot be changed. */
export const Disabled: Story = { args: { processing: true } };

/** "Pay now" found a shipment without a rate, from the cart's requirements. */
export const RateMissing: Story = {
  name: "Rate missing",
  args: { errors: [deliveryRequirement.message] },
};

export const InEuros: Story = {
  name: "In euros",
  args: { fulfillments: euroCart.fulfillments, currency: "EUR" },
};
