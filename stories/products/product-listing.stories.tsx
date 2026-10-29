import type { ProductListParams } from "@spree/sdk";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ProductListing } from "../../src/components/products/ProductListing";
import {
  filterChoices,
  firstPageOfProducts,
  linenSearchResults,
  listingFilters,
  productPage,
  secondPageOfProducts,
} from "../fixtures/shop";

const never = () => new Promise<never>(() => {});

/** The products a sage colour between $50 and $100 leaves. */
const sageBetween50And100 = firstPageOfProducts.filter((product) =>
  ["Linen Shade Table Lamp", "Linen Overshirt", "Linen Camp Shirt"].includes(
    product.name,
  ),
);

/**
 * The list on the products page, in search results and on a category page:
 * the filter bar, then the products, twelve at a time, with more loaded on
 * scrolling. Its products and filters come from the page, here from
 * fixtures; the page's heading is the page's own and not part of it.
 */
const meta = {
  title: "Storefront/Products/Product listing",
  component: ProductListing,
  tags: ["CMP-SF-G-10"],
  args: {
    state: { filters: { optionValues: [] } },
    basePath: "/us/en",
    currency: "USD",
    locale: "en",
    listId: "all-products",
    listName: "All Products",
    fetchProducts: async (params: ProductListParams) =>
      params.page === 2
        ? productPage(secondPageOfProducts, { page: 2, pages: 2, count: 14 })
        : productPage(firstPageOfProducts, { pages: 2, count: 14 }),
    fetchFilters: async () => listingFilters,
  },
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ProductListing>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The first page; the second loads when the end of the list is scrolled into view. */
export const FirstPage: Story = {
  name: "First page",
};

export const FiltersApplied: Story = {
  name: "Filters applied",
  args: {
    state: {
      filters: {
        optionValues: [filterChoices.sage],
        priceMin: 50,
        priceMax: 100,
      },
    },
    fetchProducts: async () => productPage(sageBetween50And100, { count: 3 }),
  },
};

export const SearchResults: Story = {
  name: "Search results",
  args: {
    state: { query: "linen", filters: { optionValues: [] } },
    listId: "search-results",
    listName: "Search Results",
    fetchProducts: async () => productPage(linenSearchResults),
    emptyMessage: 'We couldn\'t find any products matching "linen"',
  },
};

/** Nothing matches the filters chosen. */
export const NoProductsForTheFilters: Story = {
  name: "No products for the filters",
  args: {
    state: {
      filters: {
        optionValues: [filterChoices.sand],
        availability: "out_of_stock",
      },
    },
    fetchProducts: async () => productPage([]),
  },
};

/** Nothing matches the word searched for. */
export const NoMatchForAWord: Story = {
  name: "No match for a word",
  args: {
    state: { query: "teapot", filters: { optionValues: [] } },
    listId: "search-results",
    listName: "Search Results",
    fetchProducts: async () => productPage([]),
    emptyMessage: 'We couldn\'t find any products matching "teapot"',
  },
};

/** When the filters request fails the list shows without its filter bar. */
export const WithoutTheFilterBar: Story = {
  name: "Without the filter bar",
  args: {
    fetchFilters: async () => {
      throw new Error("The filters request failed");
    },
  },
};

export const Loading: Story = {
  args: { fetchProducts: never, fetchFilters: never },
};
