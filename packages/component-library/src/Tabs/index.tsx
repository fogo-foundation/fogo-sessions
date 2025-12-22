"use client";

import clsx from "clsx";
import { motion } from "motion/react";
import type { ComponentProps, ReactNode } from "react";
import { createContext, useContext, useId } from "react";
import {
  Tabs as AriaTabs,
  TabList as AriaTabList,
  Tab as AriaTab,
  TabPanel as AriaTabPanel,
} from "react-aria-components";

import styles from "./index.module.css";

const UnderlineLayoutIdContext = createContext<string | undefined>(undefined);

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

export const TabList = ({ className, children, ...props }: TabListProps) => {
  const layoutId = useId();
  return (
    <UnderlineLayoutIdContext.Provider value={layoutId}>
      <AriaTabList className={clsx(styles.tabList, className)} {...props}>
        {children ?? ((item) => <Tab id={item.id}>{item.name}</Tab>)}
      </AriaTabList>
    </UnderlineLayoutIdContext.Provider>
  );
};

type TabProps = Omit<ComponentProps<typeof AriaTab>, "children"> & {
  children: ReactNode;
};

export const Tab = ({ className, children, ...props }: TabProps) => {
  const underlineLayoutId = useContext(UnderlineLayoutIdContext);
  return (
    <AriaTab className={clsx(styles.tab, className)} {...props}>
      {({ isSelected }) => (
        <>
          <span>{children}</span>
          {isSelected && underlineLayoutId && (
            <motion.span
              layoutId={underlineLayoutId}
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
};

type TabPanelProps = ComponentProps<typeof AriaTabPanel>;

export const TabPanel = (props: TabPanelProps) => <AriaTabPanel {...props} />;
