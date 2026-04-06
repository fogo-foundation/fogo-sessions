import type { Meta, StoryObj } from "@storybook/react";

import { Skeleton as SkeletonComponent } from "./index.jsx";

const meta = {
  component: SkeletonComponent,
  globals: {
    backgrounds: { value: "dark" },
  },
  argTypes: {
    label: {
      control: "text",
      table: {
        category: "Skeleton",
      },
    },
    width: {
      control: "number",
      table: {
        category: "Skeleton",
      },
    },
    height: {
      control: "number",
      table: {
        category: "Skeleton",
      },
    },
  },
  args: {
    width: 100,
    height: 10,
  },
} satisfies Meta<typeof SkeletonComponent>;
export default meta;

export const Skeleton = {
  render: (args) => (
    <div style={{ width: "100%", display: "flex", justifyContent: "center" }}>
      <SkeletonComponent {...args} />
    </div>
  ),
  args: {
    label: "Loading",
  },
} satisfies StoryObj<typeof SkeletonComponent>;
