import type { Variant } from "@spree/sdk";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";
import { VariantPicker } from "../../src/components/products/VariantPicker";
import { overshirtProduct } from "../fixtures/shop";

const variants = overshirtProduct.variants ?? [];
const bySku = (sku: string) =>
  variants.find((variant) => variant.sku === sku) as Variant;

/**
 * One row per option. A colour is a swatch, grey when the colour has no
 * code; other options are buttons. A value no variant has with the other
 * choices is disabled, and a sold-out one is struck through or marked
 * "(Out of stock)" but can still be chosen.
 */
const meta = {
  title: "Storefront/Products/Variant picker",
  component: VariantPicker,
  tags: ["CMP-SF-G-10"],
  args: {
    variants,
    optionTypes: overshirtProduct.option_types ?? [],
    selectedVariant: bySku("OVERSHIRT-SAND-S"),
    onVariantChange: () => {},
  },
  render: function Render(args) {
    const [selected, setSelected] = useState(args.selectedVariant);
    return (
      <VariantPicker
        {...args}
        selectedVariant={selected}
        onVariantChange={setSelected}
      />
    );
  },
} satisfies Meta<typeof VariantPicker>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Sand comes in S and M only, so L is disabled. */
export const ColourAndSizeChosen: Story = {
  name: "Colour and size chosen",
};

/** Slate L is sold out: its swatch is struck through and its size marked. */
export const SoldOutChoice: Story = {
  name: "Sold-out choice",
  args: { selectedVariant: bySku("OVERSHIRT-SLATE-L") },
};

/** Slate has no colour code, so its swatch is grey. */
export const ColourWithoutACode: Story = {
  name: "Colour without a code",
  args: { selectedVariant: bySku("OVERSHIRT-SLATE-S") },
};

export const NothingChosen: Story = {
  name: "Nothing chosen",
  args: { selectedVariant: null },
};
