import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { MobileMenu } from "../../src/components/layout/MobileMenu";
import { rootCategories } from "../fixtures/catalog";
import { europe, unitedStates } from "../fixtures/markets";
import { StorefrontHeader } from "./storefront-header";

/**
 * Opened from the header's menu button. On a phone the menu fills the
 * screen below the header and ends with the region and language control; on
 * a desktop it is a panel with its own title. Focus moves to the first button
 * in the menu, skipping links: on a phone that is the first category with
 * subcategories, whose focus ring shows as when the menu is opened from the
 * keyboard. Opened with a tap, the ring is not drawn.
 */
const meta = {
  title: "Storefront/Layout/Mobile menu",
  component: MobileMenu,
  tags: ["CMP-SF-G-06"],
  args: { rootCategories, basePath: "/us/en", wholesaleEnabled: false },
  render: () => <StorefrontHeader />,
  parameters: {
    layout: "fullscreen",
    liquorify: {
      storefront: true,
      markets: [unitedStates, europe],
      capture: "viewport",
    },
  },
} satisfies Meta<typeof MobileMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

async function openMenu(canvasElement: HTMLElement) {
  await userEvent.click(
    await within(canvasElement).findByRole("button", { name: "Open menu" }),
  );
  return within(await within(document.body).findByRole("dialog"));
}

export const MainPanel: Story = {
  name: "Main panel",
  play: async ({ canvasElement }) => {
    const body = await openMenu(canvasElement);
    await expect(
      await body.findByRole("link", { name: "All Products" }),
    ).toBeVisible();
  },
};

/** A category with subcategories opens its own panel, with a way back and a link to the whole category. */
export const CategoryPanel: Story = {
  name: "Category panel",
  play: async ({ canvasElement }) => {
    const body = await openMenu(canvasElement);
    await userEvent.click(await body.findByRole("button", { name: "Kitchen" }));
    await expect(
      await body.findByRole("link", { name: "View all Kitchen" }),
    ).toBeVisible();
  },
};

export const SubcategoryPanel: Story = {
  name: "Subcategory panel",
  play: async ({ canvasElement }) => {
    const body = await openMenu(canvasElement);
    await userEvent.click(await body.findByRole("button", { name: "Kitchen" }));
    await userEvent.click(
      await body.findByRole("button", { name: "Tableware" }),
    );
    await expect(
      await body.findByRole("link", { name: "View all Tableware" }),
    ).toBeVisible();
  },
};

export const WholesaleLink: Story = {
  name: "Wholesale link",
  parameters: { liquorify: { wholesale: true } },
  play: async ({ canvasElement }) => {
    const body = await openMenu(canvasElement);
    await expect(
      await body.findByRole("link", { name: "Wholesale" }),
    ).toBeVisible();
  },
};
