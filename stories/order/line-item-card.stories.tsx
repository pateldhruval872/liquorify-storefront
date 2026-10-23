import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { LineItemCard } from "../../src/components/order/LineItemCard";
import { beanie, overshirt, toteBags } from "../fixtures/account";

/** One ordered item, with a link to order it again. */
const meta = {
  title: "Storefront/Order/Line item card",
  component: LineItemCard,
  tags: ["CMP-SF-G-08"],
  args: { item: overshirt, basePath: "/us/en" },
  decorators: [
    (Story) => (
      <div className="max-w-2xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof LineItemCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = { name: "With image" };

export const WithoutImage: Story = {
  name: "Without image",
  args: { item: beanie },
};

/** Two of an item without options; the total is for both. */
export const SeveralWithoutOptions: Story = {
  name: "Several without options",
  args: { item: toteBags },
};
