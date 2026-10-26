import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { SearchBar } from "../../src/components/search/SearchBar";
import { canvasTote, stonewareMug, stovetopKettle } from "../fixtures/catalog";
import { StorefrontHeader } from "../layout/storefront-header";

const suggestions = [stonewareMug, stovetopKettle, canvasTote];

/**
 * Shown where shoppers meet it, opened from the header. Suggestions are asked
 * for once two letters are typed, after a short pause.
 */
const meta = {
  title: "Storefront/Search/Search bar",
  component: SearchBar,
  tags: ["CMP-SF-G-11"],
  args: { basePath: "/us/en" },
  render: () => <StorefrontHeader />,
  parameters: {
    layout: "fullscreen",
    liquorify: { storefront: true, capture: "viewport" },
  },
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof meta>;

async function search(canvasElement: HTMLElement, text: string) {
  const canvas = within(canvasElement);
  await userEvent.click(
    await canvas.findByRole("button", { name: "Open search" }),
  );
  const field = await canvas.findByRole("combobox");
  await userEvent.type(field, text);
  return canvas;
}

/** One letter is not enough to ask for suggestions, so nothing opens. */
export const OneLetter: Story = {
  name: "One letter",
  parameters: { liquorify: { products: suggestions } },
  play: async ({ canvasElement }) => {
    const canvas = await search(canvasElement, "s");
    await expect(canvas.getByRole("combobox")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  },
};

export const Searching: Story = {
  parameters: { liquorify: { products: "loading" } },
  play: async ({ canvasElement }) => {
    const canvas = await search(canvasElement, "sto");
    await expect(await canvas.findByText("Searching...")).toBeVisible();
  },
};

export const Suggestions: Story = {
  parameters: { liquorify: { products: suggestions } },
  play: async ({ canvasElement }) => {
    const canvas = await search(canvasElement, "sto");
    await expect(
      await canvas.findByRole("option", { name: /Stoneware Mug/ }),
    ).toBeVisible();
    await expect(
      canvas.getByRole("button", { name: 'View all results for "sto"' }),
    ).toBeVisible();
  },
};

/** The arrow keys move through the suggestions; Enter opens the one chosen. */
export const KeyboardChoice: Story = {
  name: "Keyboard choice",
  parameters: { liquorify: { products: suggestions } },
  play: async ({ canvasElement }) => {
    const canvas = await search(canvasElement, "sto");
    await canvas.findByRole("option", { name: /Stoneware Mug/ });
    await userEvent.keyboard("{ArrowDown}{ArrowDown}");
    await waitFor(() =>
      expect(
        canvas.getByRole("option", { name: /Enamel Stovetop Kettle/ }),
      ).toHaveAttribute("aria-selected", "true"),
    );
  },
};

export const NoResults: Story = {
  name: "No results",
  parameters: { liquorify: { products: [] } },
  play: async ({ canvasElement }) => {
    const canvas = await search(canvasElement, "teapot");
    await expect(await canvas.findByText("No products found")).toBeVisible();
  },
};
