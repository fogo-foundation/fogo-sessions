import clsx from "clsx";
import type { ComponentProps } from "react";
import { Button as ButtonImpl } from "react-aria-components";

import styles from "./button.module.css";

type Variant = "primary" | "secondary" | "solid" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

type Props = ComponentProps<typeof ButtonImpl> & {
  variant?: Variant | undefined;
  size?: Size | undefined;
};

export const Button = ({
  className,
  variant = "primary",
  size = "md",
  ...props
}: Props) => (
  <ButtonImpl
    className={clsx(className, styles.button)}
    data-variant={variant}
    data-size={size}
    {...props}
  />
);
