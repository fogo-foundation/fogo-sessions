import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import type { ReactNode } from "react";
import { createContext, use, useCallback, useMemo } from "react";
import {
  Text,
  UNSTABLE_Toast as ReactAriaToast,
  UNSTABLE_ToastContent as ToastContent,
  UNSTABLE_ToastRegion as ToastRegion,
  UNSTABLE_ToastQueue as ToastQueue,
} from "react-aria-components";

import { Button } from "./component-library/Button/index.js";
import styles from "./toast.module.css";

const ONE_SECOND_IN_MS = 1000;
const DEFAULT_TOAST_TIMEOUT = 5 * ONE_SECOND_IN_MS;

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const toastQueue = useMemo(() => new ToastQueue<ToastContents>(), []);
  return (
    <ToastContext value={toastQueue}>
      {children}
      <ToastRegion className={styles.toastRegion ?? ""} queue={toastQueue}>
        {({ toast }) => (
          <ReactAriaToast
            className={styles.toast ?? ""}
            toast={toast}
            data-variant={TOAST_TYPE_TO_VARIANT[toast.content.type]}
          >
            <ToastContent className={styles.toastContent}>
              <Text slot="title" className={styles.title}>
                {toast.content.title}
              </Text>
              {toast.content.description && (
                <Text slot="description" className={styles.description}>
                  {toast.content.description}
                </Text>
              )}
            </ToastContent>
            <Button
              slot="close"
              variant="ghost"
              size="sm"
              className={styles.dismissButton ?? ""}
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
  if (queue) {
    const mkToastFn = useCallback(
      (toastType: ToastType) =>
        (
          title: ReactNode,
          description?: ReactNode,
          {
            timeout = DEFAULT_TOAST_TIMEOUT,
            ...opts
          }: Parameters<typeof queue.add>[1] | undefined = {},
        ) =>
          queue.add(
            { type: toastType, title, description },
            { timeout, ...opts },
          ),
      [queue],
    );
    return useMemo(
      () => ({
        queue,
        success: mkToastFn(ToastType.Success),
        error: mkToastFn(ToastType.Error),
      }),
      [queue, mkToastFn],
    );
  } else {
    throw new Error("Toast queue not initialized");
  }
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
