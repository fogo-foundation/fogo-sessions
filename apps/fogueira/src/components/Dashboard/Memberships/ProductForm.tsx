"use client";
import { SessionStateType, useSession } from "@fogo/sessions-sdk-react";
import { X } from "@phosphor-icons/react";
import { PublicKey } from "@solana/web3.js";
import { useEffect, useState } from "react";
import styles from "./ProductForm.module.scss";

// FOGO token mint address on testnet
const FOGO_TOKEN_MINT_TESTNET = "FoGoXGrdBN3M6YeSwLSLcQ6LoZJXAPn1aT5rYqYZxPJ3";

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
};

type Props = {
  product?: MembershipProduct | null;
  onClose: () => void;
  onSuccess: () => void;
};

export const MembershipProductForm = ({
  product,
  onClose,
  onSuccess,
}: Props) => {
  const session = useSession();
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    description: "",
    saleMode: "candy_machine" as "candy_machine" | "direct",
    nftCollectionMint: "",
    mintAddress: "",
    priceToken: "",
    priceAmount: "",
    treasuryAddress: "",
    candyMachineAddress: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        slug: product.slug,
        description: product.description || "",
        saleMode: product.saleMode as "candy_machine" | "direct",
        nftCollectionMint: product.nftCollectionMint || "",
        mintAddress: product.mintAddress || "",
        priceToken: product.priceToken || "",
        priceAmount: product.priceAmount || "",
        treasuryAddress: product.treasuryAddress || "",
        candyMachineAddress: product.candyMachineAddress || "",
      });
    }
  }, [product]);

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleNameChange = (value: string) => {
    setFormData({ ...formData, name: value });
    if (!product && !formData.slug) {
      setFormData((prev) => ({ ...prev, slug: generateSlug(value) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);

    if (session.type !== SessionStateType.Established) {
      setErrors({ general: "Please connect your wallet first" });
      setIsSubmitting(false);
      return;
    }

    try {
      const token = await session.createLogInToken();
      const payload: Record<string, unknown> = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description || undefined,
        saleMode: formData.saleMode,
      };

      if (formData.nftCollectionMint) {
        payload.nftCollectionMint = formData.nftCollectionMint;
      }
      if (formData.mintAddress) {
        payload.mintAddress = formData.mintAddress;
      }
      if (formData.priceAmount) {
        payload.priceAmount = formData.priceAmount;
        payload.priceToken = FOGO_TOKEN_MINT_TESTNET;
      }
      if (formData.treasuryAddress) {
        // Validate treasury address is a valid Solana public key
        try {
          new PublicKey(formData.treasuryAddress);
          payload.treasuryAddress = formData.treasuryAddress;
        } catch {
          setErrors({ treasuryAddress: "Invalid Solana wallet address" });
          setIsSubmitting(false);
          return;
        }
      }
      if (formData.candyMachineAddress) {
        payload.candyMachineAddress = formData.candyMachineAddress;
      }

      const url = product
        ? `/api/creator/membership-products/${product.id}`
        : "/api/creator/membership-products";
      const method = product ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.details) {
          const fieldErrors: Record<string, string> = {};
          for (const err of data.details as Array<{
            path: string[];
            message: string;
          }>) {
            if (err.path[0]) {
              fieldErrors[err.path[0]] = err.message;
            }
          }
          setErrors(fieldErrors);
        } else {
          setErrors({ general: data.error || "Failed to save product" });
        }
        setIsSubmitting(false);
        return;
      }

      onSuccess();
    } catch {
      setErrors({ general: "An unexpected error occurred" });
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            {product ? "Edit Product" : "Create Product"}
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <X weight="bold" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {errors.general && (
            <div className={styles.error}>{errors.general}</div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>
              Product Name <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Premium Membership"
              required
            />
            {errors.name && (
              <div className={styles.fieldError}>{errors.name}</div>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Slug <span className={styles.required}>*</span>
            </label>
            <input
              type="text"
              className={styles.input}
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              placeholder="premium-membership"
              required
            />
            <p className={styles.helpText}>
              Used in URLs. Lowercase letters, numbers, and hyphens only.
            </p>
            {errors.slug && (
              <div className={styles.fieldError}>{errors.slug}</div>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Description</label>
            <textarea
              className={styles.textarea}
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="Describe your membership product..."
              rows={4}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Sale Mode</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  value="candy_machine"
                  checked={formData.saleMode === "candy_machine"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      saleMode: e.target.value as "candy_machine",
                    })
                  }
                />
                Candy Machine
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  value="direct"
                  checked={formData.saleMode === "direct"}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      saleMode: e.target.value as "direct",
                    })
                  }
                />
                Direct Sale
              </label>
            </div>
          </div>

          {formData.saleMode === "candy_machine" && (
            <div className={styles.field}>
              <label className={styles.label}>Candy Machine Address</label>
              <input
                type="text"
                className={styles.input}
                value={formData.candyMachineAddress}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    candyMachineAddress: e.target.value,
                  })
                }
                placeholder="Enter candy machine address"
              />
              {errors.candyMachineAddress && (
                <div className={styles.fieldError}>
                  {errors.candyMachineAddress}
                </div>
              )}
            </div>
          )}

          <div className={styles.sectionHeader}>Pricing</div>

          <div className={styles.field}>
            <label className={styles.label}>Price in FOGO Tokens</label>
            <input
              type="number"
              className={styles.input}
              value={formData.priceAmount}
              onChange={(e) =>
                setFormData({ ...formData, priceAmount: e.target.value })
              }
              placeholder="e.g., 100"
              min="0"
              step="any"
            />
            <p className={styles.helpText}>
              Leave empty for free membership. Uses FOGO testnet tokens.
            </p>
            {errors.priceAmount && (
              <div className={styles.fieldError}>{errors.priceAmount}</div>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Treasury Address</label>
            <input
              type="text"
              className={styles.input}
              value={formData.treasuryAddress}
              onChange={(e) =>
                setFormData({ ...formData, treasuryAddress: e.target.value })
              }
              placeholder="Wallet to receive payments"
            />
            <p className={styles.helpText}>
              Your wallet address where FOGO tokens will be sent.
            </p>
            {errors.treasuryAddress && (
              <div className={styles.fieldError}>{errors.treasuryAddress}</div>
            )}
          </div>

          <div className={styles.sectionHeader}>NFT Configuration</div>

          <div className={styles.field}>
            <label className={styles.label}>
              NFT Collection Mint (optional)
            </label>
            <input
              type="text"
              className={styles.input}
              value={formData.nftCollectionMint}
              onChange={(e) =>
                setFormData({ ...formData, nftCollectionMint: e.target.value })
              }
              placeholder="Collection mint address"
            />
            <p className={styles.helpText}>
              Used to verify membership ownership for gated content.
            </p>
            {errors.nftCollectionMint && (
              <div className={styles.fieldError}>
                {errors.nftCollectionMint}
              </div>
            )}
          </div>

          <div className={styles.buttonGroup}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? "Saving..."
                : product
                  ? "Update Product"
                  : "Create Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
