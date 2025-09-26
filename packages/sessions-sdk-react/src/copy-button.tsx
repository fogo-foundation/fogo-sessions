import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { useState, useCallback } from "react";
import { Button } from "react-aria-components";

import styles from "./copy-button.module.css";

type Variant = "inline" | "expanded";

export const CopyButton = ({
  text,
  children,
  className,
  variant = "inline",
  ...props
}: {
  text: string;
  children: ReactNode;
  variant?: Variant | undefined;
} & Omit<ComponentProps<typeof Button>, "onPress" | "isDisabled">) => {
  const [isCopied, setIsCopied] = useState(false);

  const copyAddress = useCallback(() => {
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 2000);
      })
      .catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error(error);
      });
  }, [text]);

  return (
    <Button
      className={clsx(className, styles.copyButton)}
      onPress={copyAddress}
      isDisabled={isCopied}
      data-copied={isCopied ? "" : undefined}
      data-variant={variant}
      {...props}
    >
      <div className={styles.contents}>{children}</div>
      <div className={styles.iconContainer}>
        <CopyIcon className={styles.copyIcon} />
        <CheckIcon className={styles.checkIcon} />
      </div>
      <div className={styles.hintContainer}>
        <span className={styles.copyHint}>Click to copy</span>
        <span className={styles.checkHint}>Copied!</span>
      </div>
    </Button>
  );
};
