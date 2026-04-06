import type { Meta, StoryObj } from "@storybook/react";

import { Card as CardComponent } from "./index.jsx";

const meta = {
  component: CardComponent,
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
  },
} satisfies Meta<typeof CardComponent>;
export default meta;

export const Card = {
  args: {
    children: "Card",
  },
} satisfies StoryObj<typeof CardComponent>;
