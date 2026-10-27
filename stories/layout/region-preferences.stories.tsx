import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { RegionPreferences } from "../../src/components/layout/RegionPreferences";
import { cartWithItems } from "../fixtures/cart";
import { europe, unitedStates } from "../fixtures/markets";

/**
 * The header shows the flag on a desktop; the menu shows the flag, language
 * and currency. Either opens the same dialog. Switching sends the shopper to
 * the same page in the new country and language, which only the running
 * storefront shows.
 */
const meta = {
  title: "Storefront/Layout/Region preferences",
  component: RegionPreferences,
  tags: ["CMP-SF-G-06"],
  args: { variant: "header" },
  parameters: {
    liquorify: { storefront: true, markets: [unitedStates, europe] },
  },
} satisfies Meta<typeof RegionPreferences>;

export default meta;
type Story = StoryObj<typeof meta>;

export const HeaderControl: Story = {
  name: "Header control",
};

export const MenuControl: Story = {
  name: "Menu control",
  args: { variant: "menu" },
};

async function openDialog(canvasElement: HTMLElement) {
  await userEvent.click(
    await within(canvasElement).findByRole("button", {
      name: "Region and language",
    }),
  );
  return within(await within(document.body).findByRole("dialog"));
}

async function chooseGermany(canvasElement: HTMLElement) {
  const dialog = await openDialog(canvasElement);
  await userEvent.selectOptions(
    dialog.getByLabelText("Region"),
    "Germany (EUR)",
  );
  return dialog;
}

/** The button waits for the cart, whose currency may need to change first. */
async function submitOnceCartLoads(dialog: ReturnType<typeof within>) {
  const button = dialog.getByRole("button", { name: "Update preferences" });
  await waitFor(() => expect(button).toBeEnabled());
  await userEvent.click(button);
}

export const Dialog: Story = {
  parameters: { layout: "fullscreen", liquorify: { capture: "viewport" } },
  play: async ({ canvasElement }) => {
    const dialog = await openDialog(canvasElement);
    await expect(dialog.getByLabelText("Region")).toHaveValue("us");
  },
};

/**
 * Choosing a country lists its market's languages, and keeps the language
 * chosen when that market offers it too.
 */
export const AnotherCountry: Story = {
  name: "Another country with languages",
  parameters: { layout: "fullscreen", liquorify: { capture: "viewport" } },
  play: async ({ canvasElement }) => {
    const dialog = await chooseGermany(canvasElement);
    const language = dialog.getByLabelText("Language");
    await expect(language).toHaveValue("en");
    await expect(within(language).getAllByRole("option")).toHaveLength(3);
  },
};

/** With a cart, its currency and language change first. */
export const Updating: Story = {
  parameters: {
    layout: "fullscreen",
    liquorify: { capture: "viewport", cart: cartWithItems, holdWrites: true },
  },
  play: async ({ canvasElement }) => {
    const dialog = await chooseGermany(canvasElement);
    await submitOnceCartLoads(dialog);
    await expect(
      await dialog.findByRole("button", { name: "Updating preferences..." }),
    ).toBeDisabled();
  },
};

export const Failed: Story = {
  parameters: {
    layout: "fullscreen",
    liquorify: {
      capture: "viewport",
      cart: cartWithItems,
      failWith: "Currency is not supported",
    },
  },
  play: async ({ canvasElement }) => {
    const dialog = await chooseGermany(canvasElement);
    await submitOnceCartLoads(dialog);
    await expect(
      await dialog.findByText(
        "We couldn't update your region preferences. Please try again.",
      ),
    ).toBeVisible();
  },
};
