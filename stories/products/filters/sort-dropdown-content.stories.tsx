import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FilterDropdown } from "../../../src/components/products/filters";
import { SortDropdownContent } from "../../../src/components/products/filters/SortDropdownContent";
import { listingFilters } from "../../fixtures/shop";

/**
 * The sort orders Spree offers. Spree sends them without labels, so the
 * storefront names them; "Manual" is the order staff set, and the default.
 */
const meta = {
  title: "Storefront/Products/Filters/Sort dropdown content",
  component: SortDropdownContent,
  tags: ["CMP-SF-G-10"],
  args: {
    sortOptions: listingFilters.sort_options,
    activeSortBy: listingFilters.default_sort,
    onSortChange: () => {},
  },
  parameters: { liquorify: { capture: "viewport" } },
  render: (args) => (
    <FilterDropdown
      label="Sort"
      isOpen
      onToggle={() => {}}
      onClose={() => {}}
      align="right"
    >
      <SortDropdownContent {...args} />
    </FilterDropdown>
  ),
} satisfies Meta<typeof SortDropdownContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const DefaultOrder: Story = {
  name: "Default order",
};

export const PriceLowToHighChosen: Story = {
  name: "Price low to high chosen",
  args: { activeSortBy: "price" },
};
