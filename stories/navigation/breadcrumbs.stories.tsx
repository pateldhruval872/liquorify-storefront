import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Breadcrumbs } from "../../src/components/navigation/Breadcrumbs";
import {
  drinkwareCategory,
  kitchenCategory,
  longCategory,
  shirtsCategory,
} from "../fixtures/shop";

/**
 * Home, the category's parents, then the category. On a category page the
 * category is the last step; on a product page it is a link and the
 * product's name is the last step. The trail stays on one line.
 */
const meta = {
  title: "Storefront/Navigation/Breadcrumbs",
  component: Breadcrumbs,
  tags: ["CMP-SF-G-07"],
  args: { category: drinkwareCategory, basePath: "/us/en", locale: "en" },
} satisfies Meta<typeof Breadcrumbs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Subcategory: Story = {};

export const RootCategory: Story = {
  name: "Root category",
  args: { category: kitchenCategory },
};

export const ProductPage: Story = {
  name: "Product page",
  args: { category: shirtsCategory, productName: "Linen Overshirt" },
};

/**
 * A long name wraps inside its own step, and the trail still runs past a
 * phone's width: there the product's name falls off the screen.
 */
export const LongNames: Story = {
  name: "Long names",
  args: {
    category: longCategory,
    productName: "Large Hand-Thrown Stoneware Serving Bowl",
  },
};
