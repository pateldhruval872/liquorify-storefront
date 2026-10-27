import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "../../src/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "../../src/components/ui/sheet";

/**
 * Opened on mount. The menu and the filters slide in from the left and the
 * cart from the right; all three draw their own close button.
 */
const meta = {
  title: "Storefront/UI/Sheet",
  component: SheetContent,
  tags: ["CMP-SF-P-20"],
  parameters: { layout: "fullscreen", liquorify: { capture: "viewport" } },
  args: { side: "right", showCloseButton: true },
  render: (args) => (
    <Sheet open>
      <SheetContent {...args}>
        <SheetHeader>
          <SheetTitle>Shopping Cart</SheetTitle>
          <SheetDescription>Review the items in your cart.</SheetDescription>
        </SheetHeader>
        <SheetFooter>
          <Button>Checkout</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  ),
} satisfies Meta<typeof SheetContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Right: Story = {};

export const Left: Story = {
  args: { side: "left" },
};

export const WithoutCloseButton: Story = {
  name: "Without close button",
  args: { side: "left", showCloseButton: false },
};
