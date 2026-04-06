import { CopyButton as CopyButtonComponent } from "./index.jsx";

const meta = {
  component: CopyButtonComponent,
  globals: {
    backgrounds: { value: "dark" },
  },
  argTypes: {
    children: {
      control: "text",
      table: {
        category: "Contents",
      },
    },
    text: {
      control: "text",
      table: {
        category: "Contents",
      },
    },
    variant: {
      control: "select",
      options: ["inline", "expanded"],
      table: {
        category: "State",
      },
    },
  },
};
export default meta;

export const CopyButton = {
  args: {
    children: "Copy",
    text: "hello from CopyButton",
    variant: "inline",
  },
};
