import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { GiftCardList } from "../../src/components/account/GiftCardList";
import { inAccountColumn } from "../decorators/account-column";
import {
  activeGiftCard,
  canceledGiftCard,
  expiredGiftCard,
  partiallyUsedGiftCard,
  redeemedGiftCard,
} from "../fixtures/account";

/**
 * The Gift Cards page's list. Cards the API marks active and unexpired come
 * first; every other card is listed below them, faded. The API reports a
 * partly used card as not active, so it is listed with the used ones.
 */
const meta = {
  title: "Storefront/Account/Gift card list",
  component: GiftCardList,
  tags: ["CMP-SF-G-01"],
  parameters: { layout: "fullscreen" },
  decorators: [inAccountColumn],
} satisfies Meta<typeof GiftCardList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const EveryState: Story = {
  name: "Every state",
  args: {
    cards: [
      activeGiftCard,
      partiallyUsedGiftCard,
      redeemedGiftCard,
      canceledGiftCard,
      expiredGiftCard,
    ],
  },
};

export const ActiveOnly: Story = {
  name: "Active only",
  args: { cards: [activeGiftCard] },
};

export const PartiallyUsed: Story = {
  name: "Partially used",
  args: { cards: [partiallyUsedGiftCard] },
};

export const FullyRedeemed: Story = {
  name: "Fully redeemed",
  args: { cards: [redeemedGiftCard] },
};

export const Canceled: Story = { args: { cards: [canceledGiftCard] } };

export const Expired: Story = { args: { cards: [expiredGiftCard] } };
