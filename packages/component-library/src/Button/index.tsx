"use client";

import clsx from "clsx";
import type { ComponentProps } from "react";
import { Link, Button as UnstyledButton } from "react-aria-components";
import { classes } from "./index.styles.js";
import type { Size, Variant } from "./types.js";

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
  className: clsx(classes.buttonRoot, className),
  "data-variant": variant,
  "data-size": size,
});
