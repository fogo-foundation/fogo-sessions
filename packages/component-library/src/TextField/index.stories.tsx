import * as React from "react";

import { TextField as TextFieldComponent } from "./index.js";

type TextFieldStoryArgs = React.ComponentProps<typeof TextFieldComponent> & {
  label: string;
  labelExtra: string;
  placeholder: string;
  double: boolean;
  isDisabled: boolean;
  isPending: boolean;
  isInvalid: boolean;
  errorMessage: string;
};

const meta = {
  component: TextFieldComponent,
  argTypes: {
    label: {
      control: "text",
      table: {
        category: "Contents",
      },
    },
    labelExtra: {
      control: "text",
      table: {
        category: "Contents",
      },
    },
    placeholder: {
      control: "text",
      table: {
        category: "Contents",
      },
    },
    double: {
      control: "boolean",
      table: {
        category: "State",
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
    isInvalid: {
      control: "boolean",
      table: {
        category: "State",
      },
    },
    errorMessage: {
      control: "text",
      table: {
        category: "State",
      },
    },
  },
};
export default meta;

export const Field = {
  args: {
    label: "Label",
    labelExtra: "Optional",
    placeholder: "Type here…",
    double: false,
    isDisabled: false,
    isPending: false,
    isInvalid: false,
    errorMessage: "This is an error",
  },
  render: ({ isInvalid, errorMessage, ...args }: TextFieldStoryArgs) => (
    <TextFieldComponent
      {...args}
      isInvalid={isInvalid}
      errorMessage={isInvalid ? errorMessage : undefined}
    />
  ),
};
