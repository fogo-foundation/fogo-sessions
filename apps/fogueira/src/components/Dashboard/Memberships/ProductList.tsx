"use client";
import { Pencil, Trash } from "@phosphor-icons/react";
import styles from "./ProductList.module.scss";

type MembershipProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageBlobKey: string | null;
  nftCollectionMint: string | null;
  mintAddress: string | null;
  priceToken: string | null;
  priceAmount: string | null;
  treasuryAddress: string | null;
  saleMode: string;
  candyMachineAddress: string | null;
  createdAt: string;
  updatedAt: string;
};

type Props = {
  products: MembershipProduct[];
  onEdit: (product: MembershipProduct) => void;
  onDelete: (product: MembershipProduct) => void;
};

export const MembershipProductList = ({ products, onEdit, onDelete }: Props) => {
  if (products.length === 0) {
    return (
      <div className={styles.empty}>
        <p className={styles.emptyText}>No membership products yet</p>
        <p className={styles.emptySubtext}>
          Create your first product to get started
        </p>
      </div>
    );
  }

  return (
    <div className={styles.list}>
      {products.map((product) => (
        <div key={product.id} className={styles.card}>
          <div className={styles.cardContent}>
            <h3 className={styles.cardTitle}>{product.name}</h3>
            <p className={styles.cardSlug}>/{product.slug}</p>
            {product.description && (
              <p className={styles.cardDescription}>{product.description}</p>
            )}
            <div className={styles.cardMeta}>
              <span className={styles.cardBadge}>{product.saleMode}</span>
              <span className={styles.cardDate}>
                Created {new Date(product.createdAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <div className={styles.cardActions}>
            <button
              className={styles.actionButton}
              onClick={() => onEdit(product)}
            >
              <Pencil weight="regular" />
              Edit
            </button>
            <button
              className={styles.actionButton}
              onClick={() => onDelete(product)}
            >
              <Trash weight="regular" />
              Delete
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

