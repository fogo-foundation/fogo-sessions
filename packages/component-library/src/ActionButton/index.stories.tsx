import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { ExportIcon } from "@phosphor-icons/react/dist/ssr/Export";
import { HandCoinsIcon } from "@phosphor-icons/react/dist/ssr/HandCoins";
import { PaperPlaneTiltIcon } from "@phosphor-icons/react/dist/ssr/PaperPlaneTilt";
import { QrCodeIcon } from "@phosphor-icons/react/dist/ssr/QrCode";
import type { Meta, StoryObj } from "@storybook/react";
import type { ComponentProps } from "react";

import {
  ActionButton as ActionButtonComponent,
  ActionButtonToolbar as ActionButtonToolbarComponent,
} from "./index.jsx";

const meta = {
  component: ActionButtonComponent,
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
  },
} satisfies Meta<typeof ActionButtonComponent>;
export default meta;

export const ActionButton = {
  args: {
    children: "Button",
    isDisabled: false,
    isPending: false,
  },
} satisfies StoryObj<typeof ActionButtonComponent>;

export const ActionButtonToolbar = {
  args: {
    children: [
      <ActionButtonComponent key="0" icon={<PaperPlaneTiltIcon />}>
        Send
      </ActionButtonComponent>,
      <ActionButtonComponent key="1" icon={<QrCodeIcon />}>
        Receive
      </ActionButtonComponent>,
      <ActionButtonComponent key="2" icon={<DownloadSimpleIcon />}>
        Transfer in
      </ActionButtonComponent>,
      <ActionButtonComponent key="3" icon={<HandCoinsIcon />}>
        Get tokens
      </ActionButtonComponent>,
      <ActionButtonComponent key="4" icon={<ExportIcon />}>
        Transfer out
      </ActionButtonComponent>,
    ],
  },
  render: (args: ComponentProps<typeof ActionButtonToolbarComponent>) => (
    <ActionButtonToolbarComponent {...args} />
  ),
} satisfies StoryObj<typeof ActionButtonToolbarComponent>;
