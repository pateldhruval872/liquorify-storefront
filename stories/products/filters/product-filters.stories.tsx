import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { FilterBar } from "../../../src/components/products/filters";
import type { ActiveFilters } from "../../../src/types/filters";
import { filterChoices, listingFilters } from "../../fixtures/shop";

/**
 * `FilterBar`, the one component `ProductFilters.tsx` exports, so the stories
 * take the file's name. Above every product list. On a desktop each filter is
 * a dropdown, with the product count and sort on the right; on a phone one
 * Filters button opens the filters drawer and sort stays beside it. Choices
 * made here change the list's address in the running storefront; in the story
 * they only update the bar. Each dropdown open has its own story under its
 * content.
 */
const meta = {
  title: "Storefront/Products/Filters/Product filters",
  component: FilterBar,
  tags: ["CMP-SF-G-10"],
  args: {
    filtersData: listingFilters,
    filtersLoading: false,
    activeFilters: { optionValues: [] },
    totalCount: 14,
    onFilterChange: () => {},
  },
  render: function Render(args) {
    const [activeFilters, setActiveFilters] = useState<ActiveFilters>(
      args.activeFilters,
    );
    return (
      <FilterBar
        {...args}
        activeFilters={activeFilters}
        onFilterChange={setActiveFilters}
      />
    );
  },
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** Each filter in use shows a count on its button and a chip below the bar, with Clear all. */
export const FiltersApplied: Story = {
  name: "Filters applied",
  args: {
    activeFilters: {
      optionValues: [filterChoices.sage, filterChoices.medium],
      priceMin: 50,
      priceMax: 100,
      availability: "in_stock",
      sortBy: "price",
    },
    totalCount: 3,
  },
};

/** Waiting for the filters, the bar shows its skeleton. */
export const Loading: Story = {
  args: { filtersData: null, filtersLoading: true },
};
