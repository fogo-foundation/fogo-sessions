import clsx from "clsx";
import type { ComponentProps, CSSProperties } from "react";
import styles from "./index.module.css";

type Props = Omit<ComponentProps<"span">, "children"> & {
  label?: string | undefined;
  width?: number | undefined;
  height: number;
};

export const Skeleton = ({ className, label, width, height, ...props }: Props) => (
    <span className={clsx(styles.skeleton, className)} 
    data-fill={!width ? 'true' : undefined}
    style={{ ...(width && { "--skeleton-width": width }), ...(height && { "--skeleton-height": height }) } as CSSProperties}
    {...props}>
      <span className={styles.skeletonLabel}>{label ?? "Loading"}</span>
  </span>
);