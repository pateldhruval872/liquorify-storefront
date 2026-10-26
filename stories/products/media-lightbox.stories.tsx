import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { MediaLightbox } from "../../src/components/products/MediaLightbox";
import { mugProduct, overshirtProduct } from "../fixtures/shop";

/**
 * A picture enlarged over the page, with previous and next and a count when
 * there are several. The arrow keys move between pictures and Escape closes
 * it; focus starts on the close button.
 */
const meta = {
  title: "Storefront/Products/Media lightbox",
  component: MediaLightbox,
  tags: ["CMP-SF-G-10"],
  args: {
    images: overshirtProduct.media ?? [],
    activeIndex: 0,
    productName: overshirtProduct.name,
    onClose: () => {},
    onNavigate: () => {},
  },
  parameters: { layout: "fullscreen", liquorify: { capture: "viewport" } },
  render: function Render(args) {
    const [index, setIndex] = useState(args.activeIndex);
    return (
      <MediaLightbox {...args} activeIndex={index} onNavigate={setIndex} />
    );
  },
} satisfies Meta<typeof MediaLightbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const FirstPicture: Story = {
  name: "First picture",
};

export const LastPicture: Story = {
  name: "Last picture",
  args: { activeIndex: 3 },
};

/** One picture: no previous, next or count. */
export const OnePicture: Story = {
  name: "One picture",
  args: { images: mugProduct.media ?? [], productName: mugProduct.name },
};
