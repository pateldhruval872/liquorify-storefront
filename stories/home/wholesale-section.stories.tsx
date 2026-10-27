import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { WholesaleSection } from "../../src/components/home/WholesaleSection";

/** Shown only when the wholesale addon is on; otherwise the home page has no such section. */
const meta = {
  title: "Storefront/Home/Wholesale section",
  component: WholesaleSection,
  tags: ["CMP-SF-G-05"],
  parameters: { layout: "fullscreen", liquorify: { wholesale: true } },
  args: { basePath: "/us/en", locale: "en" },
} satisfies Meta<typeof WholesaleSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
