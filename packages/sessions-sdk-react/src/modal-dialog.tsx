import type { ComponentProps, ReactNode } from "react";
import { Dialog, Modal, ModalOverlay, Heading } from "react-aria-components";

import styles from "./modal-dialog.module.css";

type Props = Omit<ComponentProps<typeof ModalOverlay>, "children"> & {
  children: ComponentProps<typeof Modal>["children"];
  heading: ReactNode;
  message?: ReactNode | undefined;
};

export const ModalDialog = ({
  children,
  heading,
  message,
  ...props
}: Props) => (
  <ModalOverlay isDismissable className={styles.modalOverlay ?? ""} {...props}>
    <Modal isDismissable className={styles.modal ?? ""}>
      {(args) => (
        <Dialog className={styles.dialog ?? ""}>
          <Heading slot="title" className={styles.heading ?? ""}>
            {heading}
          </Heading>
          {message && <div className={styles.message}>{message}</div>}
          {typeof children === "function" ? children(args) : children}
        </Dialog>
      )}
    </Modal>
  </ModalOverlay>
);
