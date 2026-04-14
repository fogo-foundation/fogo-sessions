import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { Select as SelectComponent } from "./index.js";

const meta = {
  argTypes: {
    items: {
      description: "Array of items to display in the select",
    },
    onSelectionChange: {
      description: "Callback fired when the selection changes",
    },
    selectedKey: {
      description: "The currently selected key",
    },
  },
  component: SelectComponent,
  globals: {
    backgrounds: { value: "dark" },
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof SelectComponent>;

export default meta;

export const Select = {
  args: {
    "aria-label": "Select an option",
    items: [
      { key: "option1", label: "Option 1" },
      { key: "option2", label: "Option 2" },
      { key: "option3", label: "Option 3" },
    ],
    name: "example",
    onSelectionChange: fn(),
    selectedKey: "option1",
  },
} satisfies StoryObj<typeof SelectComponent>;
