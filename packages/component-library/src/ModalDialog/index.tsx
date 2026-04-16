import clsx from "clsx";
import type { MotionProps } from "motion/react";
import { AnimatePresence, motion } from "motion/react";
import type { ComponentProps } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";

import styles from "./index.module.css";

const MotionModal = motion.create(Modal);
const MotionModalOverlay = motion.create(ModalOverlay);

type Props = Omit<ComponentProps<typeof ModalOverlay>, keyof MotionProps> & {
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
        animate={{ opacity: 1 }}
        className={clsx(styles.modalOverlay, overlayClassName)}
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        isDismissable
        isOpen
        {...props}
      >
        <MotionModal
          animate={{ scale: 1 }}
          className={clsx(styles.modal, modalClassName)}
          data-no-padding={noPadding ? "true" : undefined}
          exit={{ scale: 1.1 }}
          initial={{ scale: 0.8 }}
          isDismissable
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
