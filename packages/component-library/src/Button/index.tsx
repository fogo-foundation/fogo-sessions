import clsx from "clsx";
import type { ComponentProps } from "react";
import { Button as UnstyledButton, Link } from "react-aria-components";

import styles from "./index.module.scss";

type Variant = "primary" | "secondary" | "solid" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

type Props = (
  | ComponentProps<typeof UnstyledButton>
  | ComponentProps<typeof Link>
) & {
  variant?: Variant | undefined;
  size?: Size | undefined;
};

export const Button = (props: Props) =>
  "href" in props ? (
    <Link {...mkProps(props)} />
  ) : (
    <UnstyledButton {...mkProps(props)} />
  );

const mkProps = ({
  className,
  variant = "primary",
  size = "md",
  ...otherProps
}: {
  className?: Parameters<typeof clsx>[0];
  variant?: Variant | undefined;
  size?: Size | undefined;
}) => ({
  ...otherProps,
  className: clsx(styles.button, className),
  "data-variant": variant,
  "data-size": size,
});
