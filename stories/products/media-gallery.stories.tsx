import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { MediaGallery } from "../../src/components/products/MediaGallery";
import { mugProduct, overshirtProduct } from "../fixtures/shop";

const pictures = overshirtProduct.media ?? [];

/**
 * The product page's pictures: the chosen one large, with a zoom hint, and
 * thumbnails below when there are several. Choosing a variant with its own
 * picture shows that picture. Clicking the large picture opens the
 * enlarged view, which has its own stories.
 */
const meta = {
  title: "Storefront/Products/Media gallery",
  component: MediaGallery,
  tags: ["CMP-SF-G-10"],
  args: { images: pictures, productName: overshirtProduct.name },
  decorators: [
    (Story) => (
      <div className="max-w-xl">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof MediaGallery>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SeveralPictures: Story = {
  name: "Several pictures",
};

/** A variant with its own picture opens on it. */
export const AVariantsPicture: Story = {
  name: "A variant's picture",
  args: { activeIndex: 2 },
};

export const OnePicture: Story = {
  name: "One picture",
  args: { images: mugProduct.media ?? [], productName: mugProduct.name },
};

/** No picture: the placeholder, and nothing to zoom. */
export const NoPicture: Story = {
  name: "No picture",
  args: { images: [] },
};
