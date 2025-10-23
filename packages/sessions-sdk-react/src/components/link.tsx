import clsx from "clsx";
import type { ComponentProps } from "react";
import { Button, Link as UnstyledLink } from "react-aria-components";

import styles from "./link.module.css";

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
  className: clsx(styles.link, className),
});
