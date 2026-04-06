"use client";

import clsx from "clsx";
import type { ComponentProps } from "react";
import { Link, Button as UnstyledButton } from "react-aria-components";

import styles from "./index.module.css";

type Variant = "primary" | "secondary" | "solid" | "ghost" | "outline";
type Size = "sm" | "md" | "lg";

type Props = (
  | ComponentProps<typeof UnstyledButton>
  | ComponentProps<typeof Link>
) & {
  variant?: Variant | undefined;
  size?: Size | undefined;
  hideLoadingSpinner?: boolean | undefined;
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
  hideLoadingSpinner,
  ...otherProps
}: {
  className?: Parameters<typeof clsx>[0];
  variant?: Variant | undefined;
  size?: Size | undefined;
  hideLoadingSpinner?: boolean | undefined;
}) => ({
  ...otherProps,
  className: clsx(styles.button, className),
  "data-variant": variant,
  "data-size": size,
  "data-enable-loading-spinner": hideLoadingSpinner ? undefined : "",
});
