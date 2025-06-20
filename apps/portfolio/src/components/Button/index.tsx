import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr/ArrowRight";
import clsx from "clsx";
import type { ReactNode } from "react";

import styles from "./index.module.scss";
import { Button as UnstyledButton } from "./react-aria";
import type { ExtendProps } from "../../extend";
import { UnstyledLink } from "../Link";

type BaseProps = {
  className?: string | undefined;
  children: ReactNode;
  variant?: "primary" | "secondary";
  fill?: boolean | undefined;
  isSelected?: boolean | undefined;
  isNoninteractive?: boolean | undefined;
  size?: "md" | "sm";
  icon?: ReactNode | undefined;
};

export type LinkProps = ExtendProps<
  typeof UnstyledLink,
  BaseProps & { href: string }
>;
export type ButtonProps = ExtendProps<typeof UnstyledButton, BaseProps>;
type Props = LinkProps | ButtonProps;

export const Button = (props: Props) =>
  "href" in props ? (
    <UnstyledLink {...mkProps(props)} />
  ) : (
    <UnstyledButton {...mkProps(props)} />
  );

export const mkProps = <T extends BaseProps>({
  className,
  children,
  variant = "secondary",
  fill,
  isSelected,
  isNoninteractive,
  size = "md",
  icon: Icon,
  ...inputProps
}: T) => ({
  className: clsx(styles.button, className),
  "data-variant": variant,
  "data-size": size,
  "data-fill": fill ? "" : undefined,
  "data-selected": isSelected ? "" : undefined,
  "data-noninteractive": isNoninteractive ? "" : undefined,
  children: (
    <>
      <div className={styles.contents1}>
        <div className={styles.mainContent}>{children}</div>
        {Icon && <div className={styles.icon}>{Icon}</div>}
      </div>
      <div aria-hidden="true" className={styles.contents2}>
        <div className={styles.mainContent}>{children}</div>
        {Icon && <div className={styles.icon}>{Icon}</div>}
      </div>
      <ArrowRightIcon className={styles.arrow} aria-hidden="true" />
    </>
  ),
  ...inputProps,
});
