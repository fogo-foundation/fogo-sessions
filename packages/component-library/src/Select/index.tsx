"use client";

import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import clsx from "clsx";
import type { ReactNode } from "react";
import {
  Select as AriaSelect,
  type SelectProps as AriaSelectProps,
  Button,
  ListBox,
  ListBoxItem,
  Popover,
  SelectValue,
} from "react-aria-components";

import styles from "./index.module.css";

type SelectProps<T extends string | number> = Omit<
  AriaSelectProps<object>,
  "children"
> & {
  items: Array<{ key: T; label: string }>;
  placeholder?: string;
  children?: ReactNode;
};

export const Select = <T extends string | number>({
  items,
  placeholder,
  className,
  children,
  ...props
}: SelectProps<T>) => {
  return (
    <AriaSelect {...props} className={clsx(styles.select, className)}>
      <Button className={styles.button ?? ""}>
        <SelectValue className={styles.value ?? ""} />
        <CaretDownIcon className={styles.arrow ?? ""} />
      </Button>
      <Popover offset={4} className={styles.selectPopover ?? ""}>
        <ListBox items={items}>
          {({ key, label }) => (
            <ListBoxItem id={key} className={styles.selectItem ?? ""}>
              {label}
            </ListBoxItem>
          )}
        </ListBox>
      </Popover>
    </AriaSelect>
  );
};
