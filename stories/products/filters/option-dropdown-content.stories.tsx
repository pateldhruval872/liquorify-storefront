import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { FilterDropdown } from "../../../src/components/products/filters";
import { OptionDropdownContent } from "../../../src/components/products/filters/OptionDropdownContent";
import { filterChoices } from "../../fixtures/shop";
import { colorFilter, sizeFilter } from "./listing-filters";

/**
 * An option's values, each with how many products have it. A colour shows its
 * swatch, grey when the colour has no code. Several can be ticked; the menu
 * stays open while ticking.
 */
const meta = {
  title: "Storefront/Products/Filters/Option dropdown content",
  component: OptionDropdownContent,
  tags: ["CMP-SF-G-10"],
  args: { filter: colorFilter, selectedValues: [], onToggle: () => {} },
  parameters: { liquorify: { capture: "viewport" } },
  render: function Render(args) {
    const [selected, setSelected] = useState(args.selectedValues);
    return (
      <FilterDropdown
        label={args.filter.label}
        badgeCount={selected.length}
        isOpen
        onToggle={() => {}}
        onClose={() => {}}
      >
        <OptionDropdownContent
          {...args}
          selectedValues={selected}
          onToggle={(id) =>
            setSelected((current) =>
              current.includes(id)
                ? current.filter((value) => value !== id)
                : [...current, id],
            )
          }
        />
      </FilterDropdown>
    );
  },
} satisfies Meta<typeof OptionDropdownContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Colours: Story = {};

export const ColoursWithChoices: Story = {
  name: "Colours, with choices",
  args: { selectedValues: [filterChoices.sage, filterChoices.sand] },
};

export const Sizes: Story = {
  args: { filter: sizeFilter },
};
