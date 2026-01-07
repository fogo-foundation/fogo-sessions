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
    fill: {
      control: "boolean",
      table: {
        category: "Skeleton",
      },
    },
  },
} satisfies Meta<typeof SkeletonComponent>;
export default meta;

export const Skeleton = {
  render: (args) => (
    <div
      style={{
        width: "100%",
        height: "100px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <SkeletonComponent {...args} />
    </div>
  ),
  args: {
    label: "Loading",
    fill: false,
    width: 20,
  },
} satisfies StoryObj<typeof SkeletonComponent>;
