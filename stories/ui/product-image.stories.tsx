import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductImage } from "../../src/components/ui/product-image";

/** In a 96 pixel frame, as an order's line items show it. */
const meta = {
  title: "Storefront/UI/Product image",
  component: ProductImage,
  tags: ["CMP-SF-P-16"],
  args: {
    src: "/fixtures/product-sand.png",
    alt: "Linen Overshirt",
    fill: true,
    sizes: "96px",
    className: "object-cover",
  },
  decorators: [
    (Story) => (
      <div className="relative w-24 h-24 bg-gray-100 rounded-xl overflow-hidden">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithImage: Story = { name: "With image" };

/** A product without an image shows the placeholder icon. */
export const NoImage: Story = { name: "No image", args: { src: null } };

/** An image that fails to load falls back to the same placeholder. */
export const Broken: Story = {
  args: { src: "/fixtures/missing-image.png", unoptimized: true },
};
