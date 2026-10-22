import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { CreditCardList } from "../../src/components/account/CreditCardList";
import { inAccountColumn } from "../decorators/account-column";
import { amexCard, mastercardCard, visaCard } from "../fixtures/account";

/** The saved cards on the Payment Methods page, each with its own Remove. */
const meta = {
  title: "Storefront/Account/Credit card list",
  component: CreditCardList,
  tags: ["CMP-SF-G-01"],
  args: { initialCards: [visaCard, mastercardCard, amexCard] },
  parameters: { layout: "fullscreen" },
  decorators: [inAccountColumn],
} satisfies Meta<typeof CreditCardList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const CardsListed: Story = { name: "Cards listed" };

export const RemoveConfirmation: Story = {
  name: "Remove confirmation",
  parameters: { liquorify: { capture: "viewport" } },
  play: async ({ canvasElement }) => {
    const [firstRemove] = within(canvasElement).getAllByRole("button", {
      name: "Remove",
    });
    await userEvent.click(firstRemove);
    await expect(
      await within(document.body).findByRole("alertdialog"),
    ).toBeVisible();
  },
};

/** A brand the storefront has no label for is named as the API gives it, with a plain card icon. */
export const UnrecognizedBrand: Story = {
  name: "Unrecognized brand",
  args: { initialCards: [{ ...visaCard, brand: "elo", default: false }] },
};
