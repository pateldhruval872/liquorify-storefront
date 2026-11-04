import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CheckoutSidebar } from "../../src/app/[country]/[locale]/(checkout)/checkout/[id]/CheckoutSidebar";
import { addressedCart, couponAndGiftCardCart } from "../fixtures/checkout";

const accepted = async (
  _code: string,
): Promise<{ success: boolean; error?: string }> => ({ success: true });

/** The order summary and the code field, beside checkout. */
const meta = {
  title: "Storefront/Pages/Checkout sidebar",
  component: CheckoutSidebar,
  tags: ["CMP-SF-PG-02"],
  args: {
    cart: addressedCart,
    onApplyCode: accepted,
    onRemoveDiscount: accepted,
    onRemoveGiftCard: accepted,
  },
  decorators: [
    (Story) => (
      <div className="max-w-[440px] bg-gray-50 p-10">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CheckoutSidebar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NoCodes: Story = { name: "No codes" };

/** With a coupon and a gift card applied the code field is hidden. */
export const CouponAndGiftCard: Story = {
  name: "Coupon and gift card",
  args: { cart: couponAndGiftCardCart },
};
