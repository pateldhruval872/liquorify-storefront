import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { expect, userEvent, within } from "storybook/test";
import { ProductDetails } from "../../src/app/[country]/[locale]/(storefront)/products/[slug]/ProductDetails";
import { HiddenPricingProvider } from "../../src/contexts/HiddenPricingContext";
import {
  mugProduct,
  overshirtOnSale,
  overshirtPriceWithheld,
  overshirtProduct,
  overshirtSoldOutChoice,
  trayProduct,
} from "../fixtures/shop";

/**
 * The product page below its breadcrumb: pictures, name, price, stock, the
 * variant picker, quantity and Add to Cart, then the description, the custom
 * fields under Properties and the chosen variant's details. Adding to the
 * cart opens the cart drawer, whose states are batch 9's.
 */
const meta = {
  title: "Storefront/Pages/Product details",
  component: ProductDetails,
  tags: ["CMP-SF-PG-04"],
  args: { product: overshirtProduct, basePath: "/us/en" },
  parameters: { layout: "fullscreen", liquorify: { storefront: true } },
} satisfies Meta<typeof ProductDetails>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Opens on the default variant, sand in S, with its picture. */
export const ColourAndSize: Story = {
  name: "Colour and size",
};

/** Choosing another colour shows that colour's picture. */
export const AnotherColourChosen: Story = {
  name: "Another colour chosen",
  play: async ({ canvasElement }) => {
    const page = within(canvasElement);
    await userEvent.click(page.getByTitle("Sage"));
    await expect(await page.findByText("OVERSHIRT-SAGE-S")).toBeVisible();
  },
};

/** The sale price, the price it replaces struck through, and a Sale badge. */
export const SalePrice: Story = {
  name: "Sale price",
  args: { product: overshirtOnSale },
};

/** A sold-out variant can be chosen, but Add to Cart is replaced by Out of Stock. */
export const SoldOutChoice: Story = {
  name: "Sold-out choice",
  args: { product: overshirtSoldOutChoice },
};

export const QuantityChosen: Story = {
  name: "Quantity chosen",
  play: async ({ canvasElement }) => {
    const page = within(canvasElement);
    const increase = page.getByRole("button", { name: "Increase quantity" });
    await userEvent.click(increase);
    await userEvent.click(increase);
    await expect(page.getByRole("textbox", { name: "Quantity" })).toHaveValue(
      "3",
    );
  },
};

/** The add is held unanswered, to show it in progress. */
export const AddingToTheCart: Story = {
  name: "Adding to the cart",
  parameters: { liquorify: { storefront: true, holdWrites: true } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement);
    await userEvent.click(page.getByRole("button", { name: "Add to Cart" }));
    await expect(await page.findByText("Adding...")).toBeVisible();
  },
};

/** No options, one picture and no custom fields. */
export const OnePictureNoOptions: Story = {
  name: "One picture, no options",
  args: { product: mugProduct },
};

export const NoPicture: Story = {
  name: "No picture",
  args: { product: trayProduct },
};

/**
 * On the storefront a withheld price leaves the price line empty, and
 * quantity and Add to Cart still show.
 */
export const PriceWithheld: Story = {
  name: "Price withheld",
  args: { product: overshirtPriceWithheld },
};

/** Inside the wholesale portal a withheld price asks the buyer to sign in, in place of ordering. */
export const PriceWithheldInWholesale: Story = {
  name: "Price withheld in wholesale",
  args: { product: overshirtPriceWithheld },
  decorators: [
    (Story) => (
      <HiddenPricingProvider
        value={{ signInHref: "/us/en/wholesale/login?redirect=%2Fus%2Fen" }}
      >
        <Story />
      </HiddenPricingProvider>
    ),
  ],
};
