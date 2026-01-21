import { Button } from "@fogo/component-library/Button";
import { ModalDialog } from "@fogo/component-library/ModalDialog";
import styles from "./index.module.scss";

export type ConfirmModalProps = {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  children: React.ReactNode;
  altText?: string;
  title?: string;
  subtitle?: string;
};

export const ConfirmModal = ({
  isOpen,
  onOpenChange,
  children,
  onConfirm,
  altText,
  title,
  subtitle,
}: ConfirmModalProps) => {
  return (
    <ModalDialog
      modalClassName={styles.confirmModal ?? ""}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <div className={styles.confirmModalHeader}>
        <div className={styles.confirmModalHeaderAltText}>{altText}</div>
        <div className={styles.confirmModalHeaderTitle}>{title}</div>
        <div className={styles.confirmModalHeaderSubtitle}>{subtitle}</div>
      </div>
      <div className={styles.confirmModalContent}>{children}</div>
      <div className={styles.confirmModalFooter}>
        <Button variant="outline" size="lg" onClick={()=> onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="solid" size="lg" onClick={onConfirm}>
          Confirm
        </Button>
      </div>
    </ModalDialog>
  );
};
