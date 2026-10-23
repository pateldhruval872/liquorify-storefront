import type { Decorator } from "@storybook/nextjs-vite";

/**
 * The account pages' content column as `AccountShell` lays it out, with the
 * navigation's place left empty, so a page's component is as wide as on the
 * running storefront: 928 pixels at the desktop width. Stories that use it
 * set the full-screen layout.
 */
export const inAccountColumn: Decorator = (Story) => (
  <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
    <div className="flex flex-col lg:flex-row gap-8">
      <div className="hidden lg:block lg:w-64 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <Story />
      </div>
    </div>
  </div>
);
