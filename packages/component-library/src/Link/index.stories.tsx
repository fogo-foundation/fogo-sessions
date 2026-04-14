import type { Meta, StoryObj } from "@storybook/react";

import { Link as LinkComponent } from "./index.jsx";

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
  },
  component: LinkComponent,
  globals: {
    backgrounds: { value: "dark" },
  },
} satisfies Meta<typeof LinkComponent>;
export default meta;

export const Link = {
  args: {
    children: "Link",
    href: "https://www.fogo.io",
    isDisabled: false,
    target: "_blank",
  },
} satisfies StoryObj<typeof LinkComponent>;
