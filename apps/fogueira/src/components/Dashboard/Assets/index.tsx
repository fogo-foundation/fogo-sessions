"use client";
import { SessionStateType, useSession } from "@fogo/sessions-sdk-react";
import {
  Image,
  Spinner,
  Trash,
  Upload,
  Video,
  File,
} from "@phosphor-icons/react";
import { useEffect, useState } from "react";
import { useFileUpload } from "../../../hooks/useFileUpload";
import styles from "./index.module.scss";

type Asset = {
  id: string;
  blobKey: string;
  mimeType: string;
  sizeBytes: number;
  filename: string | null;
  createdAt: string;
};

export const AssetsPage = () => {
  const session = useSession();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { upload, uploading, error: uploadError } = useFileUpload();

  useEffect(() => {
    if (session.type === SessionStateType.Established) {
      fetchAssets();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchAssets = async () => {
    if (session.type !== SessionStateType.Established) return;

    try {
      const token = await session.createLogInToken();
      const response = await fetch("/api/creator/assets", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAssets(data.assets || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    const result = await upload(file);
    if (result) {
      // Refresh assets list
      await fetchAssets();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) {
      return;
    }

    if (session.type !== SessionStateType.Established) return;

    setDeletingId(id);

    try {
      const token = await session.createLogInToken();
      const response = await fetch(`/api/creator/assets/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Remove from list
        setAssets(assets.filter((asset) => asset.id !== id));
      } else {
        const data = await response.json();
        alert(data.error || "Failed to delete asset");
      }
    } catch {
      alert("Failed to delete asset");
    } finally {
      setDeletingId(null);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <Image weight="regular" size={24} />;
    }
    if (mimeType.startsWith("video/")) {
      return <Video weight="regular" size={24} />;
    }
    return <File weight="regular" size={24} />;
  };

  const isImage = (mimeType: string) => mimeType.startsWith("image/");
  const isVideo = (mimeType: string) => mimeType.startsWith("video/");

  if (loading) {
    return (
      <div className={styles.loading}>
        <Spinner className={styles.spinner} weight="bold" />
        <p>Loading assets...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Assets</h1>
          <p className={styles.subtitle}>
            Manage your uploaded images, videos, and files
          </p>
        </div>
        <label className={styles.uploadButton}>
          <input
            type="file"
            accept="image/*,video/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleUpload(file);
              // Reset input
              e.target.value = "";
            }}
            className={styles.fileInput}
            disabled={uploading}
          />
          {uploading ? (
            <>
              <Spinner className={styles.buttonSpinner} weight="bold" />
              Uploading...
            </>
          ) : (
            <>
              <Upload weight="bold" />
              Upload Asset
            </>
          )}
        </label>
      </div>

      {uploadError && (
        <div className={styles.error}>
          <p>{uploadError}</p>
        </div>
      )}

      {assets.length === 0 ? (
        <div className={styles.empty}>
          <Upload size={48} weight="light" className={styles.emptyIcon} />
          <h2 className={styles.emptyTitle}>No assets yet</h2>
          <p className={styles.emptyText}>
            Upload images, videos, or other files to get started
          </p>
        </div>
      ) : (
        <div className={styles.grid}>
          {assets.map((asset) => (
            <div key={asset.id} className={styles.assetCard}>
              <div className={styles.assetPreview}>
                {isImage(asset.mimeType) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={asset.blobKey}
                    alt={asset.filename || "Asset"}
                    className={styles.previewImage}
                  />
                ) : isVideo(asset.mimeType) ? (
                  <div className={styles.videoPlaceholder}>
                    <Video weight="regular" size={32} />
                  </div>
                ) : (
                  <div className={styles.filePlaceholder}>
                    {getFileIcon(asset.mimeType)}
                  </div>
                )}
                <div className={styles.assetOverlay}>
                  <a
                    href={asset.blobKey}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.viewButton}
                    title="View asset"
                  >
                    View
                  </a>
                  <button
                    onClick={() => handleDelete(asset.id)}
                    disabled={deletingId === asset.id}
                    className={styles.deleteButton}
                    title="Delete asset"
                  >
                    {deletingId === asset.id ? (
                      <Spinner weight="bold" size={16} />
                    ) : (
                      <Trash weight="bold" size={16} />
                    )}
                  </button>
                </div>
              </div>
              <div className={styles.assetInfo}>
                <p className={styles.assetName} title={asset.filename || "Untitled"}>
                  {asset.filename || "Untitled"}
                </p>
                <div className={styles.assetMeta}>
                  <span className={styles.fileType}>{asset.mimeType}</span>
                  <span className={styles.fileSize}>
                    {formatFileSize(asset.sizeBytes)}
                  </span>
                </div>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(asset.blobKey);
                    // Show feedback
                    const btn = document.activeElement as HTMLElement;
                    if (btn) {
                      const originalText = btn.textContent;
                      btn.textContent = "Copied!";
                      setTimeout(() => {
                        if (btn) btn.textContent = originalText;
                      }, 2000);
                    }
                  }}
                  className={styles.copyButton}
                  title="Copy URL"
                >
                  Copy URL
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

