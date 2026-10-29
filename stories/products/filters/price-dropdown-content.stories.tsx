import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FilterDropdown } from "../../../src/components/products/filters";
import { PriceDropdownContent } from "../../../src/components/products/filters/PriceDropdownContent";
import { priceBuckets } from "./listing-filters";

/** Price ranges built from the listing's lowest and highest price; one at a time. */
const meta = {
  title: "Storefront/Products/Filters/Price dropdown content",
  component: PriceDropdownContent,
  tags: ["CMP-SF-G-10"],
  args: {
    priceBuckets,
    activeFilters: { optionValues: [] },
    onPriceChange: () => {},
  },
  parameters: { liquorify: { capture: "viewport" } },
  render: (args) => (
    <FilterDropdown
      label="Price"
      badgeCount={args.activeFilters.priceMin === undefined ? 0 : 1}
      isOpen
      onToggle={() => {}}
      onClose={() => {}}
    >
      <PriceDropdownContent {...args} />
    </FilterDropdown>
  ),
} satisfies Meta<typeof PriceDropdownContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ranges: Story = {};

export const ARangeChosen: Story = {
  name: "A range chosen",
  args: { activeFilters: { optionValues: [], priceMin: 50, priceMax: 100 } },
};
