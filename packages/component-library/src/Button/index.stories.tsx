import type { Meta, StoryObj } from "@storybook/react";

import { Button as ButtonComponent } from "./index.jsx";

const meta = {
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
        category: "State",
      },
    },
    isPending: {
      control: "boolean",
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
    variant: {
      control: "select",
      options: ["primary", "secondary", "solid", "ghost", "outline"],
      table: {
        category: "State",
      },
    },
  },
  component: ButtonComponent,
  globals: {
    backgrounds: { value: "dark" },
  },
} satisfies Meta<typeof ButtonComponent>;
export default meta;

export const Button = {
  args: {
    children: "Button",
    isDisabled: false,
    isPending: false,
    size: "md",
    variant: "primary",
  },
} satisfies StoryObj<typeof ButtonComponent>;
