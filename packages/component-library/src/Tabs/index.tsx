"use client";

import clsx from "clsx";
import { motion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import {
  Tabs as AriaTabs,
  TabList as AriaTabList,
  Tab as AriaTab,
  TabPanel as AriaTabPanel,
} from "react-aria-components";

import styles from "./index.module.css";

export type TabItem = {
  id: string;
  name: string;
};

type TabsProps = ComponentProps<typeof AriaTabs>;

export const Tabs = ({ className, ...props }: TabsProps) => (
  <AriaTabs className={clsx(styles.tabs, className)} {...props} />
);

type TabListProps = Omit<
  ComponentProps<typeof AriaTabList<TabItem>>,
  "children"
> & {
  items: TabItem[];
  children?: (item: TabItem) => ReactNode;
};

export const TabList = ({
  className,
  items,
  children,
  ...props
}: TabListProps) => (
  <AriaTabList
    className={clsx(styles.tabList, className)}
    items={items}
    {...props}
  >
    {children ?? ((item) => <Tab id={item.id}>{item.name}</Tab>)}
  </AriaTabList>
);

type TabProps = Omit<ComponentProps<typeof AriaTab>, "children"> & {
  children: ReactNode;
};

export const Tab = ({ className, children, ...props }: TabProps) => (
  <AriaTab className={clsx(styles.tab, className)} {...props}>
    {({ isSelected }) => (
      <>
        <span>{children}</span>
        {isSelected && (
          <motion.span
            layoutId="underline"
            className={styles.underline}
            transition={{
              type: "spring",
              bounce: 0.6,
              duration: 0.6,
            }}
            style={{ originY: "top" }}
          />
        )}
      </>
    )}
  </AriaTab>
);

type TabPanelProps = ComponentProps<typeof AriaTabPanel>;

export const TabPanel = ({ className, ...props }: TabPanelProps) => (
  <AriaTabPanel className={clsx(styles.tabPanel, className)} {...props} />
);
