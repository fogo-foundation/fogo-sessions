import type { Meta, StoryObj } from "@storybook/react";

import { Tabs as TabsComponent, TabList, Tab, TabPanel } from "./index.jsx";

const meta = {
  component: TabsComponent,
  globals: {
    backgrounds: { value: "dark" },
  },
  decorators: [
    (Story) => (
      <div style={{ width: 400, height: 300 }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof TabsComponent>;
export default meta;

export const Tabs = {
  render: () => (
    <TabsComponent>
      <TabList
        aria-label="Tabs example"
        items={[
          { id: "tab1", name: "First Tab" },
          { id: "tab2", name: "Second Tab" },
          { id: "tab3", name: "Third Tab" },
        ]}
      >
        {({ id, name }) => <Tab id={id}>{name}</Tab>}
      </TabList>
      <TabPanel id="tab1">
        <div>First tab content</div>
      </TabPanel>
      <TabPanel id="tab2">
        <div>Second tab content</div>
      </TabPanel>
      <TabPanel id="tab3">
        <div>Third tab content</div>
      </TabPanel>
    </TabsComponent>
  ),
} satisfies StoryObj<typeof TabsComponent>;
