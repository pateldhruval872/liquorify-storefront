import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useEffect } from "react";
import { toast } from "sonner";
import { Toaster } from "../../src/components/ui/sonner";

/**
 * The toaster with one toast. The toast is raised in an effect that runs
 * after the toaster's own, so the toaster is listening when it arrives, and
 * it stays until dismissed so the screenshot does not depend on timing.
 */
function ToasterWithToast({ kind }: { kind: "success" | "error" }) {
  useEffect(() => {
    const id =
      kind === "success"
        ? toast.success("Added to cart", { duration: Number.POSITIVE_INFINITY })
        : toast.error("Could not update the cart", {
            duration: Number.POSITIVE_INFINITY,
          });
    return () => {
      toast.dismiss(id);
    };
  }, [kind]);
  return null;
}

// The storefront has no theme provider, so the toaster follows the system
// dark setting while the page stays light; it is also captured with that
// setting (LIQ-010 §8).
const meta = {
  title: "Storefront/UI/Toaster",
  component: ToasterWithToast,
  tags: ["CMP-SF-P-21", "system-dark"],
  parameters: { liquorify: { capture: "viewport" } },
  decorators: [
    (Story) => (
      <>
        <Toaster />
        <Story />
      </>
    ),
  ],
} satisfies Meta<typeof ToasterWithToast>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Success: Story = { args: { kind: "success" } };

export const ErrorToast: Story = { name: "Error", args: { kind: "error" } };
