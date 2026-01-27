"use client";
import { X } from "@phosphor-icons/react";
import styles from "./DeleteConfirmation.module.scss";

type Props = {
  productName: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export const DeleteConfirmation = ({
  productName,
  onConfirm,
  onCancel,
}: Props) => {
  return (
    <div className={styles.overlay} onClick={onCancel}>
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Delete Membership Product</h2>
          <button className={styles.closeButton} onClick={onCancel}>
            <X weight="bold" />
          </button>
        </div>
        <div className={styles.content}>
          <p className={styles.message}>
            Are you sure you want to delete <strong>{productName}</strong>?
          </p>
          <p className={styles.warning}>
            This action cannot be undone. All associated data will be permanently
            deleted.
          </p>
        </div>
        <div className={styles.actions}>
          <button className={styles.cancelButton} onClick={onCancel}>
            Cancel
          </button>
          <button className={styles.deleteButton} onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

