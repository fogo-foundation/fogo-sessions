import type { Meta, StoryObj } from "@storybook/react";

import { Skeleton as SkeletonComponent } from "./index.jsx";

const meta = {
  args: {
    height: 10,
    width: 100,
  },
  argTypes: {
    height: {
      control: "number",
      table: {
        category: "Skeleton",
      },
    },
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
  },
  component: SkeletonComponent,
  globals: {
    backgrounds: { value: "dark" },
  },
} satisfies Meta<typeof SkeletonComponent>;
export default meta;

export const Skeleton = {
  args: {
    label: "Loading",
  },
  render: (args) => (
    <div style={{ display: "flex", justifyContent: "center", width: "100%" }}>
      <SkeletonComponent {...args} />
    </div>
  ),
} satisfies StoryObj<typeof SkeletonComponent>;
