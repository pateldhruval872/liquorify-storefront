import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FilterDropdown } from "../../../src/components/products/filters";
import { OptionDropdownContent } from "../../../src/components/products/filters/OptionDropdownContent";
import { filterChoices } from "../../fixtures/shop";
import { sizeFilter } from "./listing-filters";

/** One filter's button and its menu. The button shows how many of its choices are in use. */
const meta = {
  title: "Storefront/Products/Filters/Filter dropdown",
  component: FilterDropdown,
  tags: ["CMP-SF-G-10"],
  args: {
    label: "Size",
    isOpen: false,
    onToggle: () => {},
    onClose: () => {},
    children: (
      <OptionDropdownContent
        filter={sizeFilter}
        selectedValues={[filterChoices.medium]}
        onToggle={() => {}}
      />
    ),
  },
  parameters: { liquorify: { capture: "viewport" } },
} satisfies Meta<typeof FilterDropdown>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};

export const ClosedWithAChoice: Story = {
  name: "Closed, with a choice",
  args: { badgeCount: 1 },
};

export const Open: Story = {
  args: { badgeCount: 1, isOpen: true },
};
