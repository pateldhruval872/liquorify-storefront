import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { HeroSection } from "../../src/components/home/HeroSection";

const meta = {
  title: "Storefront/Home/Hero section",
  component: HeroSection,
  tags: ["CMP-SF-G-05"],
  parameters: { layout: "fullscreen" },
  args: { basePath: "/us/en", locale: "en" },
} satisfies Meta<typeof HeroSection>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
