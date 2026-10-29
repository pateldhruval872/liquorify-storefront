import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FilterChips } from "../../../src/components/products/filters";
import { filterChoices, listingFilters } from "../../fixtures/shop";
import { priceBuckets } from "./listing-filters";

/** One chip for each choice in use, each with its own remove button, and Clear all. */
const meta = {
  title: "Storefront/Products/Filters/Filter chips",
  component: FilterChips,
  tags: ["CMP-SF-G-10"],
  args: {
    activeFilters: {
      optionValues: [filterChoices.sage, filterChoices.medium],
      priceMin: 50,
      priceMax: 100,
      availability: "in_stock",
    },
    filtersData: listingFilters,
    priceBuckets,
    onRemoveOptionValue: () => {},
    onRemovePrice: () => {},
    onRemoveAvailability: () => {},
    onClearAll: () => {},
  },
} satisfies Meta<typeof FilterChips>;

export default meta;
type Story = StoryObj<typeof meta>;

export const OneOfEachKind: Story = {
  name: "One of each kind",
};

export const OneChoice: Story = {
  name: "One choice",
  args: { activeFilters: { optionValues: [filterChoices.sand] } },
};
