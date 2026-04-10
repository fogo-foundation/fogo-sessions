import { GasPumpIcon } from "@phosphor-icons/react/dist/ssr/GasPump";
import type * as React from "react";
import { TextField as TextFieldComponent } from "./index.jsx";

const meta = {
  argTypes: {
    double: {
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
    isDisabled: {
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
    isPending: {
      control: "boolean",
      table: {
        category: "State",
      },
    },
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
  },
  component: TextFieldComponent,
  globals: {
    backgrounds: { value: "dark" },
  },
};
export default meta;

export const TextField = {
  args: {
    double: false,
    isDisabled: false,
    isPending: false,
    label: "Label",
    labelExtra: "Optional",
    placeholder: "Type here…",
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
