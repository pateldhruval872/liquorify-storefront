import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  Footer,
  FooterCategoryLinks,
} from "../../src/components/layout/Footer";
import { rootCategories } from "../fixtures/catalog";

/**
 * The shop column lists the top-level categories. The brand column and its
 * links are the Spree demo's own, which the storefront marks for removal.
 */
const meta = {
  title: "Storefront/Layout/Footer",
  component: Footer,
  tags: ["CMP-SF-G-06"],
  parameters: { layout: "fullscreen" },
  args: {
    basePath: "/us/en",
    locale: "en",
    categoryLinks: (
      <FooterCategoryLinks rootCategories={rootCategories} basePath="/us/en" />
    ),
  },
} satisfies Meta<typeof Footer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WholesaleLink: Story = {
  name: "Wholesale link",
  parameters: { liquorify: { wholesale: true } },
};

/** When the categories cannot be loaded, the shop column keeps its other link. */
export const NoCategories: Story = {
  name: "No categories",
  args: { categoryLinks: null },
};
