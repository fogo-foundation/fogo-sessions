"use client";
import { SessionStateType, useSession } from "@fogo/sessions-sdk-react";
import { Plus } from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { MembershipCardSkeleton } from "../Skeleton";
import { DeleteConfirmation } from "./DeleteConfirmation";
import styles from "./index.module.scss";
import { MembershipProductForm } from "./ProductForm";
import { MembershipProductList } from "./ProductList";

type MembershipProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  benefits: string[];
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

export const MembershipsPage = () => {
  const session = useSession();
  const [products, setProducts] = useState<MembershipProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<MembershipProduct | null>(null);
  const [deletingProduct, setDeletingProduct] =
    useState<MembershipProduct | null>(null);

  useEffect(() => {
    if (session.type === SessionStateType.Established) {
      fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchProducts = async () => {
    if (session.type !== SessionStateType.Established) return;

    try {
      const token = await session.createLogInToken();
      const response = await fetch("/api/creator/membership-products", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch {
      // Silently fail - user can retry
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingProduct(null);
    setShowForm(true);
  };

  const handleEdit = (product: MembershipProduct) => {
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    setEditingProduct(null);
    fetchProducts();
  };

  const handleDeleteClick = (product: MembershipProduct) => {
    setDeletingProduct(product);
  };

  const handleDeleteCancel = () => {
    setDeletingProduct(null);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingProduct || session.type !== SessionStateType.Established) {
      return;
    }

    const productId = deletingProduct.id;
    setDeletingProduct(null);

    try {
      const token = await session.createLogInToken();
      const response = await fetch(
        `/api/creator/membership-products/${productId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        const data = await response.json();
        // TODO: Show error toast/notification
        throw new Error(data.error || "Failed to delete product");
      }
      fetchProducts();
    } catch {
      // TODO: Show error toast/notification
      // Silently fail for now - user can retry
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Membership Products</h1>
          <p className={styles.subtitle}>
            Manage your token-gated membership products
          </p>
        </div>
        <button className={styles.createButton} onClick={handleCreate}>
          <Plus weight="bold" />
          Create Product
        </button>
      </div>

      {showForm && (
        <MembershipProductForm
          product={editingProduct}
          onClose={handleFormClose}
          onSuccess={handleFormClose}
        />
      )}

      {deletingProduct && (
        <DeleteConfirmation
          productName={deletingProduct.name}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
        />
      )}

      {loading ? (
        <div className={styles.skeletonList}>
          <MembershipCardSkeleton />
          <MembershipCardSkeleton />
          <MembershipCardSkeleton />
        </div>
      ) : (
        <MembershipProductList
          products={products}
          onEdit={handleEdit}
          onDelete={handleDeleteClick}
        />
      )}
    </div>
  );
};
