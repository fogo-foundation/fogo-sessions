import type { Meta, StoryObj } from "@storybook/react";

import { Card as CardComponent } from "./index.jsx";

const meta = {
  argTypes: {
    children: {
      control: "text",
      table: {
        category: "Contents",
      },
    },
  },
  component: CardComponent,
  globals: {
    backgrounds: { value: "dark" },
  },
} satisfies Meta<typeof CardComponent>;
export default meta;

export const Card = {
  args: {
    children: "Card",
  },
} satisfies StoryObj<typeof CardComponent>;
