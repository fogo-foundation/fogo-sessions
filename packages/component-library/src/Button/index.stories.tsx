import type { Meta, StoryObj } from "@storybook/react";

import { Button as ButtonComponent } from "./index.jsx";

const meta = {
  component: ButtonComponent,
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
    variant: {
      control: "select",
      options: ["primary", "secondary", "solid", "ghost", "outline"],
      table: {
        category: "State",
      },
    },
    size: {
      control: "select",
      options: ["sm", "md", "lg"],
      table: {
        category: "State",
      },
    },
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
  },
} satisfies Meta<typeof ButtonComponent>;
export default meta;

export const Button = {
  args: {
    children: "Button",
    size: "md",
    variant: "primary",
    isDisabled: false,
    isPending: false,
  },
} satisfies StoryObj<typeof ButtonComponent>;
