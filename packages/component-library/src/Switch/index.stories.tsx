import type { Meta, StoryObj } from "@storybook/react";

import { Switch as SwitchComponent } from "./index.js";

const meta = {
  component: SwitchComponent,
  globals: {
    backgrounds: { value: "dark" },
  },
  argTypes: {
    children: {
      control: "text",
      table: {
        category: "Contents",
      },
    },
    isDisabled: {
      control: "boolean",
      table: {
        category: "States",
      },
    },
  },
} satisfies Meta<typeof SwitchComponent>;
export default meta;

export const Switch = {
  args: {
    children: "Enable Session Management",
    isDisabled: false,
  },
} satisfies StoryObj<typeof SwitchComponent>;
