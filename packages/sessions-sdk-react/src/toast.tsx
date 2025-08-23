import { XCircleIcon } from "@phosphor-icons/react/dist/ssr/XCircle";
import type { ReactNode } from "react";
import { createContext, use, useMemo } from "react";
import {
  Button,
  Text,
  UNSTABLE_Toast as ReactAriaToast,
  UNSTABLE_ToastContent as ToastContent,
  UNSTABLE_ToastRegion as ToastRegion,
  UNSTABLE_ToastQueue as ToastQueue,
} from "react-aria-components";

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
            <ToastContent>
              <Text slot="description">{toast.content.contents}</Text>
            </ToastContent>
            <Button slot="close" className={styles.dismissButton ?? ""}>
              <XCircleIcon size={16} />
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
    return useMemo(
      () => ({
        queue,
        success: (
          contents: ReactNode,
          {
            timeout = DEFAULT_TOAST_TIMEOUT,
            ...opts
          }: Parameters<typeof queue.add>[1] | undefined = {},
        ) =>
          queue.add(
            { contents, type: ToastType.Success },
            { timeout, ...opts },
          ),
        error: (
          contents: ReactNode,
          {
            timeout = DEFAULT_TOAST_TIMEOUT,
            ...opts
          }: Parameters<typeof queue.add>[1] | undefined = {},
        ) =>
          queue.add({ contents, type: ToastType.Error }, { timeout, ...opts }),
      }),
      [queue],
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
  contents: ReactNode;
};

enum ToastType {
  Success,
  Error,
}

const TOAST_TYPE_TO_VARIANT: Record<ToastType, string> = {
  [ToastType.Success]: "success",
  [ToastType.Error]: "error",
};
