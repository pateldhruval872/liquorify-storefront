import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { CouponCode } from "../../src/components/checkout/CouponCode";
import {
  addressedCart,
  couponAndGiftCardCart,
  couponCart,
  giftCardCart,
  unknownCodeError,
} from "../fixtures/checkout";

const accepted = async (
  _code: string,
): Promise<{ success: boolean; error?: string }> => ({ success: true });

/**
 * One field for a coupon or a gift card: checkout tries the code as a coupon
 * first, then as a gift card. The field hides once one of each is applied.
 */
const meta = {
  title: "Storefront/Checkout/Coupon code",
  component: CouponCode,
  tags: ["CMP-SF-G-04"],
  args: {
    cart: addressedCart,
    onApply: accepted,
    onRemoveDiscount: accepted,
    onRemoveGiftCard: accepted,
  },
  decorators: [
    (Story) => (
      <div className="max-w-[360px]">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof CouponCode>;

export default meta;
type Story = StoryObj<typeof meta>;

async function submitCode(canvasElement: HTMLElement, code: string) {
  const canvas = within(canvasElement);
  await userEvent.type(canvas.getByRole("textbox"), code);
  await userEvent.click(canvas.getByRole("button", { name: "Apply" }));
}

export const Empty: Story = {};

export const Applying: Story = {
  args: { onApply: () => new Promise(() => {}) },
  play: async ({ canvasElement }) => {
    await submitCode(canvasElement, "WELCOME10");
    await expect(
      within(canvasElement).getByRole("button", { name: "Applying..." }),
    ).toBeDisabled();
  },
};

/** Spree knows the code as neither a coupon nor a gift card. */
export const Refused: Story = {
  args: {
    onApply: async () => ({ success: false, error: unknownCodeError }),
  },
  play: async ({ canvasElement }) => {
    await submitCode(canvasElement, "SPRING");
    await within(canvasElement).findByText(unknownCodeError);
  },
};

export const CouponApplied: Story = {
  name: "Coupon applied",
  args: { cart: couponCart },
};

export const GiftCardApplied: Story = {
  name: "Gift card applied",
  args: { cart: giftCardCart },
};

export const BothApplied: Story = {
  name: "Coupon and gift card applied",
  args: { cart: couponAndGiftCardCart },
};

export const RemovalRefused: Story = {
  name: "Removal refused",
  args: {
    cart: couponCart,
    onRemoveDiscount: async () => ({ success: false }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      canvas.getByRole("button", { name: /Remove coupon/ }),
    );
    await canvas.findByText("Failed to remove coupon code");
  },
};
