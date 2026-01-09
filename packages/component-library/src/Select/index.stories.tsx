import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { Select as SelectComponent } from "./index.js";

const meta = {
  component: SelectComponent,
  globals: {
    backgrounds: { value: "dark" },
  },
  parameters: {
    layout: "centered",
  },
  argTypes: {
    items: {
      description: "Array of items to display in the select",
    },
    selectedKey: {
      description: "The currently selected key",
    },
    onSelectionChange: {
      description: "Callback fired when the selection changes",
    },
  },
} satisfies Meta<typeof SelectComponent>;

export default meta;

export const Select = {
  args: {
    name: "example",
    "aria-label": "Select an option",
    items: [
      { key: "option1", label: "Option 1" },
      { key: "option2", label: "Option 2" },
      { key: "option3", label: "Option 3" },
    ],
    selectedKey: "option1",
    onSelectionChange: fn(),
  },
} satisfies StoryObj<typeof SelectComponent>;
