"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import clsx from "clsx";
import type { ReactNode } from "react";
import { createContext, use, useCallback, useMemo } from "react";
import {
  UNSTABLE_Toast as ReactAriaToast,
  Text,
  UNSTABLE_ToastContent as ToastContent,
  UNSTABLE_ToastQueue as ToastQueue,
  UNSTABLE_ToastRegion as ToastRegion,
} from "react-aria-components";
import { Button } from "../Button/index.js";
import styles from "./index.module.css";

const ONE_SECOND_IN_MS = 1000;
const DEFAULT_TOAST_TIMEOUT = 5 * ONE_SECOND_IN_MS;

export const ToastProvider = ({
  children,
  toastRegionClassName,
}: {
  children: ReactNode;
  toastRegionClassName?: string;
}) => {
  const toastQueue = useMemo(() => new ToastQueue<ToastContents>(), []);
  return (
    <ToastContext value={toastQueue}>
      {children}
      <ToastRegion
        className={clsx(styles.toastRegion, toastRegionClassName)}
        queue={toastQueue}
      >
        {({ toast }) => (
          <ReactAriaToast
            className={styles.toast ?? ""}
            data-variant={TOAST_TYPE_TO_VARIANT[toast.content.type]}
            toast={toast}
          >
            <ToastContent className={styles.toastContent}>
              <Text className={styles.title} slot="title">
                {toast.content.title}
              </Text>
              {toast.content.description && (
                <Text className={styles.description} slot="description">
                  {toast.content.description}
                </Text>
              )}
            </ToastContent>
            <Button
              className={styles.dismissButton ?? ""}
              size="sm"
              slot="close"
              variant="ghost"
            >
              <XIcon size={16} />
            </Button>
          </ReactAriaToast>
        )}
      </ToastRegion>
    </ToastContext>
  );
};

export const useToast = () => {
  const queue = use(ToastContext);
  const mkToastFn = useCallback(
    (toastType: ToastType) =>
      (
        title: ReactNode,
        description?: ReactNode,
        {
          timeout = DEFAULT_TOAST_TIMEOUT,
          ...opts
        }: Parameters<ToastQueue<ToastContents>["add"]>[1] | undefined = {},
      ) =>
        queue?.add(
          { description, title, type: toastType },
          { timeout, ...opts },
        ),
    [queue],
  );
  const out = useMemo(
    () => ({
      error: mkToastFn(ToastType.Error),
      queue,
      success: mkToastFn(ToastType.Success),
    }),
    [queue, mkToastFn],
  );
  if (!queue) {
    throw new Error("Toast queue not initialized");
  }
  return out;
};

const ToastContext = createContext<undefined | ToastQueue<ToastContents>>(
  undefined,
);

type ToastContents = {
  type: ToastType;
  title: ReactNode;
  description?: ReactNode;
};

enum ToastType {
  Success,
  Error,
}

const TOAST_TYPE_TO_VARIANT: Record<ToastType, string> = {
  [ToastType.Success]: "success",
  [ToastType.Error]: "error",
};
