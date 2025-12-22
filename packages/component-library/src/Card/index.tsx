"use client";

import clsx from "clsx";
import type { ComponentProps } from "react";

import styles from "./index.module.css";

type CardProps = ComponentProps<"div">;

export const Card = ({ children, className, ...props }: CardProps) => {
  return (
    <div className={clsx(styles.card, className)} {...props}>
      {children}
    </div>
  );
};
