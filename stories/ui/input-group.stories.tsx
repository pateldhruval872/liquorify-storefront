import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Search } from "lucide-react";
import { userEvent } from "storybook/test";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "../../src/components/ui/input-group";

/** As the header's search field uses it: a search box with the icon in front. */
const meta = {
  title: "Storefront/UI/Input group",
  component: InputGroupInput,
  tags: ["CMP-SF-P-11"],
  args: {
    type: "search",
    placeholder: "Search...",
    "aria-label": "Search...",
  },
  render: (args) => (
    <div className="max-w-sm">
      <InputGroup>
        <InputGroupInput {...args} />
        <InputGroupAddon>
          <Search />
        </InputGroupAddon>
      </InputGroup>
    </div>
  ),
} satisfies Meta<typeof InputGroupInput>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Filled: Story = {
  args: { defaultValue: "stoneware" },
};

export const Focused: Story = {
  play: async () => {
    await userEvent.tab();
  },
};

export const Disabled: Story = {
  args: { disabled: true },
};
