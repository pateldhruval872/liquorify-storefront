import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ShoppingBag } from "lucide-react";
import { Button } from "../../src/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../src/components/ui/card";

const meta = {
  title: "Storefront/UI/Card",
  component: Card,
  tags: ["CMP-SF-P-05"],
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * The sign-in, register and password pages frame their forms this way, in
 * the pages' own column.
 */
export const Default: Story = {
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <Card>
      <CardHeader className="text-center">
        <CardTitle>My Account</CardTitle>
        <CardDescription>
          Sign in to access your account and order history.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button size="lg" className="w-full">
          Sign In
        </Button>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Don't have an account?{" "}
          <span className="text-primary font-medium">Sign up</span>
        </p>
      </CardFooter>
    </Card>
  ),
};

/** A tile of the account overview, which links to one section. */
export const Tile: Story = {
  decorators: [
    (Story) => (
      <div className="max-w-md">
        <Story />
      </div>
    ),
  ],
  render: () => (
    <Card className="hover:border-gray-300 transition-colors h-full">
      <CardContent className="flex items-center gap-4 py-0">
        <div className="p-3 bg-gray-100 rounded-xl">
          <ShoppingBag className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-medium text-gray-900">Order History</h2>
          <p className="mt-1 text-sm text-gray-500">
            View your past orders and track shipments
          </p>
        </div>
      </CardContent>
    </Card>
  ),
};
