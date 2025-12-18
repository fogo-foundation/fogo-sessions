"use client";

import clsx from "clsx";
import type { ComponentProps } from "react";
import { Button, Link as UnstyledLink } from "react-aria-components";

import { classes } from "./index.styles.js";

export const Link = (
  props: ComponentProps<typeof Button> | ComponentProps<typeof UnstyledLink>,
) =>
  "href" in props ? (
    <UnstyledLink {...mkProps(props)} />
  ) : (
    <Button {...mkProps(props)} />
  );

const mkProps = ({
  className,
  ...otherProps
}: {
  className?: Parameters<typeof clsx>[0];
}) => ({
  ...otherProps,
  className: clsx(classes.link, className),
});
