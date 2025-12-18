"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";
import { useState, useCallback } from "react";
import { Button } from "react-aria-components";

import { classes } from "./index.styles.js";

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
      className={clsx(className, classes.copyButton)}
      onPress={copyAddress}
      isDisabled={isCopied}
      data-copied={isCopied ? "" : undefined}
      data-variant={variant}
      {...props}
    >
      <div className={classes.contents}>{children}</div>
      <div className={classes.iconContainer}>
        <CopyIcon className={classes.copyIcon} />
        <CheckIcon className={classes.checkIcon} />
      </div>
      <div className={classes.hintContainer}>
        <span className={classes.copyHint}>Click to copy</span>
        <span className={classes.checkHint}>Copied!</span>
      </div>
    </Button>
  );
};
