"use client";

import clsx from "clsx";
import type { ComponentProps } from "react";
import { Link as BaseLink } from "react-aria-components";

import styles from "./index.module.scss";

export const Link = ({
  className,
  ...props
}: ComponentProps<typeof UnstyledLink>) => (
  <UnstyledLink className={clsx(className, styles.link)} {...props} />
);

export const UnstyledLink = (props: ComponentProps<typeof BaseLink>) => (
  <BaseLink
    {...(props.href?.startsWith("/")
      ? {}
      : {
          target: "_blank",
          rel: "noreferrer",
        })}
    {...props}
  />
);
