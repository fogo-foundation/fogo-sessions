"use client";

import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { Toolbar, Button as UnstyledButton } from "react-aria-components";

import styles from "./index.module.css";

type ActionButtonProps = ComponentProps<typeof UnstyledButton> & {
  icon?: ReactNode;
  children: ReactNode;
};

export const ActionButton = ({
  className,
  icon,
  children,
  ...props
}: ActionButtonProps) => (
  <UnstyledButton className={clsx(styles.actionButton, className)} {...props}>
    {icon && <span className={styles.icon}>{icon}</span>}
    <span className={styles.text}>{children}</span>
  </UnstyledButton>
);

export const ActionButtonToolbar = ({
  className,
  ...props
}: ComponentProps<typeof Toolbar>) => (
  <Toolbar className={clsx(styles.actionButtonToolbar, className)} {...props} />
);
