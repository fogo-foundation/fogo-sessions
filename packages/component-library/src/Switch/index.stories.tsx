import type { Meta, StoryObj } from "@storybook/react";

import { Switch as SwitchComponent } from "./index.jsx";

const meta = {
  component: SwitchComponent,
  globals: {
    backgrounds: { value: "dark" },
  },
  argTypes: {
    isDisabled: {
      control: "boolean",
      table: {
        category: "State",
      },
    },
    isPending: {
      control: "boolean",
      table: {
        category: "State",
      },
    },
    onChange: {
      table: {
        category: "Behavior",
      },
    },
    children: {
      control: "text",
      table: {
        category: "Label",
      },
    },
  },
} satisfies Meta<typeof SwitchComponent>;
export default meta;

export const Switch = {
  args: {
    children: "Enable Session Management",
    isDisabled: false,
    isPending: false,
  },
} satisfies StoryObj<typeof SwitchComponent>;
