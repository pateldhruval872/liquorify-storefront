import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, within } from "storybook/test";
import { InfiniteProductList } from "../../src/components/products/InfiniteProductList";
import {
  firstPageOfProducts,
  productPage,
  secondPageOfProducts,
} from "../fixtures/shop";

/**
 * The products of a list. The next page loads when the end of the list comes
 * within 200 pixels of the screen. The stories start with two products, so
 * the end is in view at once.
 */
const meta = {
  title: "Storefront/Products/Infinite product list",
  component: InfiniteProductList,
  tags: ["CMP-SF-G-10"],
  args: {
    initialProducts: firstPageOfProducts.slice(0, 2),
    initialPage: 1,
    totalPages: 1,
    listParams: { limit: 12 },
    fetchPage: async () => productPage(secondPageOfProducts),
    basePath: "/us/en",
    currency: "USD",
  },
} satisfies Meta<typeof InfiniteProductList>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every page is shown, so the list says there is nothing more. */
export const EndOfTheList: Story = {
  name: "End of the list",
};

/** The next page is on its way. */
export const LoadingMore: Story = {
  name: "Loading more",
  args: { totalPages: 2, fetchPage: () => new Promise(() => {}) },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText("Loading more..."),
    ).toBeVisible();
  },
};

/** The second page has been added below the first. */
export const MoreLoaded: Story = {
  name: "More loaded",
  args: {
    totalPages: 2,
    fetchPage: async () =>
      productPage(secondPageOfProducts, { page: 2, pages: 2, count: 4 }),
  },
  play: async ({ canvasElement }) => {
    await expect(
      await within(canvasElement).findByText("No more products to load"),
    ).toBeVisible();
  },
};

/**
 * When the next page fails, the list stops and says nothing: no message and
 * no way to try again.
 */
export const LoadingMoreFailed: Story = {
  name: "Loading more failed",
  args: {
    totalPages: 2,
    fetchPage: async () => {
      throw new Error("The products request failed");
    },
  },
};
