import { ModalDialog } from '@fogo/component-library/ModalDialog';
import styles from './index.module.scss';

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
      className={styles.confirmModal}
      isOpen={isOpen}
      onOpenChange={onOpenChange}
    >
      <div className={styles.confirmModalHeader}>
        <div className={styles.confirmModalHeaderAltText}>{altText}</div>
        <div className={styles.confirmModalHeaderTitle}>{title}</div>
        <div className={styles.confirmModalHeaderSubtitle}>{subtitle}</div>
      </div>
      {children}
    </ModalDialog>
  );
};
