import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

import { Button } from "./button.js";
import { errorToString } from "../error-to-string.js";
import styles from "./fetch-error.module.css";

type Props = {
  headline: ReactNode;
  error: unknown;
  reset?: (() => void) | undefined;
} & ComponentProps<"div">;

export const FetchError = ({
  headline,
  error,
  reset,
  className,
  ...props
}: Props) => (
  <div className={clsx(styles.fetchError, className)} {...props}>
    <WarningCircleIcon className={styles.icon} />
    <span className={styles.headline}>{headline}</span>
    <span className={styles.message}>{errorToString(error)}</span>
    {reset !== undefined && (
      <Button
        className={styles.retryButton ?? ""}
        variant="solid"
        onPress={reset}
      >
        Retry
      </Button>
    )}
  </div>
);
