import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { fn } from "storybook/test";
import GlobalError from "../../src/app/global-error";

/**
 * Shown in place of the whole document when a page fails to render, so it
 * draws its own document and the storefront's header and footer are absent.
 */
const meta = {
  title: "Storefront/Pages/Global error",
  component: GlobalError,
  tags: ["CMP-SF-PG-13"],
  parameters: { layout: "fullscreen", liquorify: { capture: "viewport" } },
  args: { error: new Error("A page failed to render"), reset: fn() },
} satisfies Meta<typeof GlobalError>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
