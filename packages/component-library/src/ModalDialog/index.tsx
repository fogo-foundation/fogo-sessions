import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import type { ComponentProps } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";

import styles from "./index.module.css";

const MotionModal = motion.create(Modal);
const MotionModalOverlay = motion.create(ModalOverlay);

type Props = Omit<ComponentProps<typeof MotionModalOverlay>, "children"> & {
  children: ComponentProps<typeof Modal>["children"];
  dialogClassName?: string | undefined;
  overlayClassName?: string | undefined;
  modalClassName?: string | undefined;
  noPadding?: boolean;
};

export const ModalDialog = ({
  children,
  isOpen,
  dialogClassName,
  overlayClassName,
  modalClassName,
  noPadding,
  ...props
}: Props) => (
  <AnimatePresence>
    {isOpen && (
      <MotionModalOverlay
        isDismissable
        className={clsx(styles.modalOverlay, overlayClassName)}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        isOpen
        {...props}
      >
        <MotionModal
          isDismissable
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          exit={{ scale: 1.1 }}
          className={clsx(styles.modal, modalClassName)}
          data-no-padding={noPadding ? "true" : undefined}
        >
          {(args) => (
            <Dialog className={clsx(styles.dialog, dialogClassName)}>
              {typeof children === "function" ? children(args) : children}
            </Dialog>
          )}
        </MotionModal>
      </MotionModalOverlay>
    )}
  </AnimatePresence>
);
