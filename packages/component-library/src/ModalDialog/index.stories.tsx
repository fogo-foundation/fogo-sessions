import type { Meta, StoryObj } from "@storybook/react";
import type * as React from "react";
import { useState } from "react";
import { Button } from "../Button/index.jsx";
import { ModalDialog as ModalDialogComponent } from "./index.jsx";

const meta = {
  component: ModalDialogComponent,
  argTypes: {
    children: {
      control: "text",
      table: {
        category: "Contents",
      },
    },
  },
} satisfies Meta<typeof ModalDialogComponent>;
export default meta;

const ControlledModalDialogStory = (
  args: React.ComponentProps<typeof ModalDialogComponent>,
) => {
  const [isOpen, setIsOpen] = useState(false);

  const onOpenChange = (nextIsOpen: boolean) => {
    setIsOpen(nextIsOpen);
  };

  return (
    <>
      <Button
        onClick={() => {
          setIsOpen(!isOpen);
        }}
      >
        {isOpen ? "Close modal" : "Open modal"}
      </Button>

      <ModalDialogComponent
        {...args}
        isOpen={isOpen}
        onOpenChange={onOpenChange}
      >
        <div>ModalDialog</div>
      </ModalDialogComponent>
    </>
  );
};

export const ModalDialog = {
  args: {
    children: "ModalDialog",
  },
  render: (args) => <ControlledModalDialogStory {...args} />,
} satisfies StoryObj<typeof ModalDialogComponent>;
