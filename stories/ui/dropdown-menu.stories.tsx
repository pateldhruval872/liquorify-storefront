import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ChevronDown } from "lucide-react";
import { Button } from "../../src/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "../../src/components/ui/dropdown-menu";

/**
 * The storefront uses the trigger, the content, checkbox items and radio
 * items, in the product list's filter and sort dropdowns. The menu's other
 * parts (plain items, labels, separators, shortcuts and submenus) are used by
 * no screen. Open stories are opened on mount.
 */
const meta = {
  title: "Storefront/UI/Dropdown menu",
  component: DropdownMenu,
  tags: ["CMP-SF-P-09"],
  parameters: { liquorify: { capture: "viewport" } },
} satisfies Meta<typeof DropdownMenu>;

export default meta;
type Story = StoryObj<typeof meta>;

function Trigger({ label }: { label: string }) {
  return (
    <DropdownMenuTrigger asChild>
      <Button variant="outline" size="sm">
        <span>{label}</span>
        <ChevronDown className="w-4 h-4" />
      </Button>
    </DropdownMenuTrigger>
  );
}

export const Closed: Story = {
  render: () => (
    <DropdownMenu>
      <Trigger label="Size" />
      <DropdownMenuContent>
        <DropdownMenuCheckboxItem>S</DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

/** Several can be ticked, as in an option filter. */
export const CheckboxItems: Story = {
  name: "Checkbox items",
  render: () => (
    <DropdownMenu defaultOpen>
      <Trigger label="Size" />
      <DropdownMenuContent>
        <DropdownMenuCheckboxItem>S</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked>M</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem checked>L</DropdownMenuCheckboxItem>
        <DropdownMenuCheckboxItem disabled>XL</DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};

/** One at a time, as in the price, stock and sort dropdowns. */
export const RadioItems: Story = {
  name: "Radio items",
  render: () => (
    <DropdownMenu defaultOpen>
      <Trigger label="Sort" />
      <DropdownMenuContent>
        <DropdownMenuRadioGroup value="price">
          <DropdownMenuRadioItem value="manual">Manual</DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="price">
            Price (low-high)
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="-price">
            Price (high-low)
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  ),
};
