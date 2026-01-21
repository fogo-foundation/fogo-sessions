import { Button } from "@fogo/component-library/Button";
import { ModalDialog } from "@fogo/component-library/ModalDialog";
import type React from "react";
import styles from "./index.module.scss";

export type ConfirmModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  children: React.ReactNode;
  altText?: string;
  title?: string;
  subtitle?: string;
  action: React.ReactNode;
};

export const ConfirmModal = ({
  isOpen,
  onOpenChange,
  children,
  altText,
  title,
  subtitle,
  action,
}: ConfirmModalProps) => (
    <ModalDialog
      modalClassName={styles.confirmModal ?? ""}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <div className={styles.confirmModalHeader} data-no-children={children ? undefined : "true"}>
        <div className={styles.confirmModalHeaderAltText}>{altText}</div>
        <div className={styles.confirmModalHeaderTitle}>{title}</div>
        <div className={styles.confirmModalHeaderSubtitle}>{subtitle}</div>
      </div>
      {children && <div className={styles.confirmModalContent}>{children}</div>}
      <div className={styles.confirmModalFooter}>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <div>{action}</div>
      </div>
    </ModalDialog>
  );