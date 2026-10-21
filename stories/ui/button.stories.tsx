import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ShoppingBag } from "lucide-react";
import { userEvent } from "storybook/test";
import { Button } from "../../src/components/ui/button";

const meta = {
  title: "Storefront/UI/Button",
  component: Button,
  tags: ["CMP-SF-P-04"],
  args: { children: "Add to cart" },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = { args: { children: "Add all to cart" } };

export const Planted: Story = {
  name: "Planted, no reference",
  args: { variant: "outline" },
};

export const Outline: Story = { args: { variant: "outline" } };

export const Secondary: Story = { args: { variant: "secondary" } };

export const Ghost: Story = { args: { variant: "ghost" } };

export const Destructive: Story = {
  args: { variant: "destructive", children: "Remove" },
};

export const Link: Story = {
  args: { variant: "link", children: "View cart" },
};

export const Sizes: Story = {
  render: (args) => (
    <div className="flex flex-wrap items-center gap-3">
      <Button {...args} size="xs">
        xs
      </Button>
      <Button {...args} size="sm">
        sm
      </Button>
      <Button {...args}>default</Button>
      <Button {...args} size="lg">
        lg
      </Button>
      <Button {...args} size="icon-xs" aria-label="Cart">
        <ShoppingBag />
      </Button>
      <Button {...args} size="icon-sm" aria-label="Cart">
        <ShoppingBag />
      </Button>
      <Button {...args} size="icon" aria-label="Cart">
        <ShoppingBag />
      </Button>
      <Button {...args} size="icon-lg" aria-label="Cart">
        <ShoppingBag />
      </Button>
    </div>
  ),
};

export const WithIcon: Story = {
  name: "With icon",
  args: {
    children: (
      <>
        <ShoppingBag data-icon="inline-start" />
        Add to cart
      </>
    ),
  },
};

export const Disabled: Story = { args: { disabled: true } };

export const FocusVisible: Story = {
  name: "Focus visible",
  play: async () => {
    await userEvent.tab();
  },
};
