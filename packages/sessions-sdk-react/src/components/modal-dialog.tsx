import clsx from "clsx";
import { AnimatePresence, motion } from "motion/react";
import type { ComponentProps } from "react";
import { Dialog, Modal, ModalOverlay } from "react-aria-components";

import styles from "./modal-dialog.module.css";

const MotionModal = motion.create(Modal);
const MotionModalOverlay = motion.create(ModalOverlay);

type Props = Omit<ComponentProps<typeof MotionModalOverlay>, "children"> & {
  children: ComponentProps<typeof Modal>["children"];
  dialogClassName?: string | undefined;
};

export const ModalDialog = ({
  children,
  isOpen,
  dialogClassName,
  ...props
}: Props) => (
  <AnimatePresence>
    {isOpen && (
      <MotionModalOverlay
        isDismissable
        className={styles.modalOverlay ?? ""}
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
          className={styles.modal ?? ""}
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
