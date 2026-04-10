import { CopyButton as CopyButtonComponent } from "./index.jsx";

const meta = {
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
  component: CopyButtonComponent,
  globals: {
    backgrounds: { value: "dark" },
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
