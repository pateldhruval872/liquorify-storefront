import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import tokens from "./storefront.tokens.json";
import { TokenTable } from "./token-table";

const meta = {
  title: "Tokens/Storefront",
  component: TokenTable,
  tags: ["TK-SF", "TK-SF-T", "TK-SF-A", "TK-TW-S", "desktop-only"],
  args: { document: tokens, idPattern: /^TK-SF-\d/ },
} satisfies Meta<typeof TokenTable>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SemanticTokens: Story = { name: "Semantic tokens" };

export const ThemeEntries: Story = {
  name: "Theme entries",
  args: { idPattern: /^TK-SF-T-/ },
};

export const ColourUtilityAliases: Story = {
  name: "Colour utility aliases",
  args: { idPattern: /^TK-SF-A$/ },
};

export const TailwindPalette: Story = {
  name: "Tailwind palette",
  args: { idPattern: /^TK-TW-S$/ },
};
