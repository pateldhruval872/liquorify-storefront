import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Button } from "../../src/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../../src/components/ui/dialog";

/** Opened on mount; the address editor is this dialog without its close button. */
const meta = {
  title: "Storefront/UI/Dialog",
  component: DialogContent,
  tags: ["CMP-SF-P-08"],
  parameters: { layout: "fullscreen", liquorify: { capture: "viewport" } },
  args: { showCloseButton: true },
  render: (args) => (
    <Dialog open>
      <DialogContent {...args}>
        <DialogHeader>
          <DialogTitle>Edit Address</DialogTitle>
          <DialogDescription>
            Manage your shipping and billing addresses
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline">Cancel</Button>
          <Button>Save Address</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ),
} satisfies Meta<typeof DialogContent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutCloseButton: Story = {
  name: "Without close button",
  args: { showCloseButton: false },
};

export const FooterCloseButton: Story = {
  name: "Footer close button",
  render: (args) => (
    <Dialog open>
      <DialogContent {...args}>
        <DialogHeader>
          <DialogTitle>Edit Address</DialogTitle>
          <DialogDescription>
            Manage your shipping and billing addresses
          </DialogDescription>
        </DialogHeader>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  ),
};
