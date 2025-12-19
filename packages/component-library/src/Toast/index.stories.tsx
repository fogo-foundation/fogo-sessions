import * as React from "react";

import { ToastProvider, useToast } from "./index.jsx";
import { Button } from "../Button/index.jsx";

type ToastStoryArgs = {
  title: React.ReactNode;
  description: React.ReactNode;
  timeoutMs: number;
};

const ToastStoryInner = ({ title, description, timeoutMs }: ToastStoryArgs) => {
  const toast = useToast();
  return (
    <div style={{ display: "flex", gap: 12 }}>
      <Button
        variant="secondary"
        onClick={() => {
          toast.success(title, description, { timeout: timeoutMs });
        }}
      >
        Show success toast
      </Button>

      <Button
        onClick={() => {
          toast.error(title, description, { timeout: timeoutMs });
        }}
      >
        Show error toast
      </Button>
    </div>
  );
};

const meta = {
  component: ToastProvider,
  globals: {
    backgrounds: { value: "dark" },
  },
  argTypes: {
    title: {
      control: "text",
      table: {
        category: "Contents",
      },
    },
    description: {
      control: "text",
      table: {
        category: "Contents",
      },
    },
    timeoutMs: {
      control: { type: "number", min: 0, step: 500 },
      table: {
        category: "State",
      },
    },
  },
};
export default meta;

export const Toast = {
  args: {
    title: "Toast title",
    description: "Optional description",
    timeoutMs: 5000,
  },
  render: (args: ToastStoryArgs) => (
    <ToastProvider>
      <ToastStoryInner {...args} />
    </ToastProvider>
  ),
};
