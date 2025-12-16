import type { Meta, StoryObj } from "@storybook/react";

import { Link as LinkComponent } from "./index.jsx";

const meta = {
  component: LinkComponent,
  globals: {
    backgrounds: { value: 'dark' },
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
} satisfies Meta<typeof LinkComponent>;
export default meta;

export const Link = {
  args: {
    children: "Link",
    href: "https://www.fogo.io",
    target: "_blank",
    isDisabled: false,
  },
} satisfies StoryObj<typeof LinkComponent>;
