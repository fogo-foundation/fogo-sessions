import clsx from "clsx";
import type { ComponentProps } from "react";
import { Button as ButtonImpl } from "react-aria-components";

import styles from "./index.module.scss";

export const Button = ({
  className,
  ...props
}: ComponentProps<typeof ButtonImpl>) => (
  <ButtonImpl className={clsx(className, styles.button)} {...props} />
);
