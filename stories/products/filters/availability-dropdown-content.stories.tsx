import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FilterDropdown } from "../../../src/components/products/filters";
import { AvailabilityDropdownContent } from "../../../src/components/products/filters/AvailabilityDropdownContent";
import { availabilityFilter } from "./listing-filters";

/** In stock or out of stock, with how many products are each; one at a time. */
const meta = {
  title: "Storefront/Products/Filters/Availability dropdown content",
  component: AvailabilityDropdownContent,
  tags: ["CMP-SF-G-10"],
  args: { filter: availabilityFilter, onChange: () => {} },
  parameters: { liquorify: { capture: "viewport" } },
  render: (args) => (
    <FilterDropdown
      label="Availability"
      badgeCount={args.selected ? 1 : 0}
      isOpen
      onToggle={() => {}}
      onClose={() => {}}
    >
      <AvailabilityDropdownContent {...args} />
    </FilterDropdown>
  ),
} satisfies Meta<typeof AvailabilityDropdownContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const InStockChosen: Story = {
  name: "In stock chosen",
  args: { selected: "in_stock" },
};
