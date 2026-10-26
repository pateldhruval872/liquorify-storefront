import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { StorefrontHeader } from "./storefront-header";

/** The header's frame: its search button swaps the header for the search field. */
const meta = {
  title: "Storefront/Layout/Search toggle",
  component: StorefrontHeader,
  tags: ["CMP-SF-G-06"],
  parameters: {
    layout: "fullscreen",
    liquorify: { storefront: true, capture: "viewport" },
  },
} satisfies Meta<typeof StorefrontHeader>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Once open, the field has focus and the header's links are out of reach until it closes. */
export const Open: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Open search" }),
    );
    await expect(await canvas.findByRole("combobox")).toHaveFocus();
  },
};
