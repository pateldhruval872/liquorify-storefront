import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { AddressBlock } from "../../src/components/order/AddressBlock";
import { minimalAddress, studioAddress } from "../fixtures/account";

const meta = {
  title: "Storefront/Order/Address block",
  component: AddressBlock,
  tags: ["CMP-SF-G-08"],
  args: { address: studioAddress },
} satisfies Meta<typeof AddressBlock>;

export default meta;
type Story = StoryObj<typeof meta>;

/** Company, second line and phone, each shown only when present. */
export const Full: Story = {};

export const Minimal: Story = { args: { address: minimalAddress } };
