import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { CategoryBanner } from "../../src/app/[country]/[locale]/(storefront)/c/[...permalink]/CategoryBanner";
import {
  drinkwareCategory,
  kitchenCategory,
  tablewareCategory,
  tablewareWithoutPicture,
} from "../fixtures/shop";

/**
 * The top of a category page: the category's picture behind its breadcrumb,
 * name and description, then links to its subcategories. Without a picture
 * the banner keeps its height on a grey background.
 */
const meta = {
  title: "Storefront/Pages/Category banner",
  component: CategoryBanner,
  tags: ["CMP-SF-PG-03"],
  args: { category: tablewareCategory, basePath: "/us/en", locale: "en" },
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof CategoryBanner>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithPictureAndSubcategories: Story = {
  name: "With picture and subcategories",
};

export const WithoutPicture: Story = {
  name: "Without picture",
  args: { category: tablewareWithoutPicture },
};

/** A subcategory with no children of its own: no links below the banner. */
export const Subcategory: Story = {
  args: { category: drinkwareCategory },
};

export const RootCategory: Story = {
  name: "Root category",
  args: { category: kitchenCategory },
};
