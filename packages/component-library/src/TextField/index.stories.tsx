import { GasPumpIcon } from "@phosphor-icons/react/dist/ssr";
import * as React from "react";
import { TextField as TextFieldComponent } from "./index.jsx";

const meta = {
  component: TextFieldComponent,
  globals: {
    backgrounds: { value: "dark" },
  },
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

export const TextField = {
  args: {
    label: "Label",
    labelExtra: "Optional",
    placeholder: "Type here…",
    double: false,
    isDisabled: false,
    isPending: false,
  },
  render: (args: React.ComponentProps<typeof TextFieldComponent>) => (
    <TextFieldComponent {...args} />
  ),
};

export const Textarea = {
  args: {
    ...TextField.args,
    double: true,
  },
  render: (args: React.ComponentProps<typeof TextFieldComponent>) => (
    <TextFieldComponent {...args} />
  ),
};

export const TextFieldWithRightExtra = {
  args: {
    ...TextField.args,
    rightExtra: <GasPumpIcon />,
  },
  render: (args: React.ComponentProps<typeof TextFieldComponent>) => (
    <TextFieldComponent {...args} />
  ),
};
