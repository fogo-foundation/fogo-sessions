import type * as React from "react";
import { Button } from "../Button/index.jsx";
import { ToastProvider, useToast } from "./index.jsx";

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
        onClick={() => {
          toast.success(title, description, { timeout: timeoutMs });
        }}
        variant="secondary"
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
  argTypes: {
    description: {
      control: "text",
      table: {
        category: "Contents",
      },
    },
    timeoutMs: {
      control: { min: 0, step: 500, type: "number" },
      table: {
        category: "State",
      },
    },
    title: {
      control: "text",
      table: {
        category: "Contents",
      },
    },
  },
  component: ToastProvider,
  globals: {
    backgrounds: { value: "dark" },
  },
};
export default meta;

export const Toast = {
  args: {
    description: "Optional description",
    timeoutMs: 5000,
    title: "Toast title",
  },
  render: (args: ToastStoryArgs) => (
    <ToastProvider>
      <ToastStoryInner {...args} />
    </ToastProvider>
  ),
};
