import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MobileFilterDrawer } from "../../../src/components/products/filters";
import { filterChoices, listingFilters } from "../../fixtures/shop";
import { priceBuckets } from "./listing-filters";

/**
 * Opened from the Filters button on a phone; it is the same drawer at any
 * width. Choices are kept in the drawer until Show results applies them.
 */
const meta = {
  title: "Storefront/Products/Filters/Mobile filter drawer",
  component: MobileFilterDrawer,
  tags: ["CMP-SF-G-10"],
  args: {
    isOpen: true,
    onClose: () => {},
    filtersData: listingFilters,
    activeFilters: { optionValues: [] },
    priceBuckets,
    onApply: () => {},
  },
  parameters: { layout: "fullscreen", liquorify: { capture: "viewport" } },
} satisfies Meta<typeof MobileFilterDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const WithChoices: Story = {
  name: "With choices",
  args: {
    activeFilters: {
      optionValues: [filterChoices.sage, filterChoices.medium],
      priceMin: 50,
      priceMax: 100,
      availability: "in_stock",
    },
  },
};
