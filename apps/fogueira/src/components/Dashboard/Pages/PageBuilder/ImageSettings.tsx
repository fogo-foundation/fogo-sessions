"use client";
import { Upload, Spinner } from "@phosphor-icons/react";
import { useRef } from "react";
import { useFileUpload } from "../../../../hooks/useFileUpload";
import styles from "./SettingsPanel.module.scss";

type Props = {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
};

export const ImageSettings = ({ config, onUpdate }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload, uploading, error } = useFileUpload();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const result = await upload(file);
    if (result) {
      onUpdate({ ...config, url: result.url });
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <div className={styles.settingsGroup}>
        <label className={styles.label}>
          <span>Upload Image</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className={styles.fileInput}
            disabled={uploading}
          />
          <button
            type="button"
            className={styles.uploadButton}
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Spinner className={styles.spinner} />
                Uploading...
              </>
            ) : (
              <>
                <Upload weight="bold" />
                Choose File
              </>
            )}
          </button>
        </label>
        {error && <p className={styles.error}>{error}</p>}
      </div>

      <div className={styles.divider}>
        <span>or enter URL</span>
      </div>

      <div className={styles.settingsGroup}>
        <label className={styles.label}>
          <span>Image URL</span>
          <input
            type="url"
            value={(config.url as string) || ""}
            onChange={(e) => onUpdate({ ...config, url: e.target.value })}
            placeholder="https://example.com/image.jpg"
            className={styles.input}
          />
        </label>
      </div>

      {config.url && (
        <div className={styles.preview}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={config.url as string}
            alt="Preview"
            className={styles.previewImage}
          />
        </div>
      )}

      <div className={styles.settingsGroup}>
        <label className={styles.label}>
          <span>Alt Text</span>
          <input
            type="text"
            value={(config.alt as string) || ""}
            onChange={(e) => onUpdate({ ...config, alt: e.target.value })}
            placeholder="Describe the image"
            className={styles.input}
          />
        </label>
      </div>

      <div className={styles.settingsGroup}>
        <label className={styles.label}>
          <span>Width</span>
          <select
            value={(config.width as string) || "100%"}
            onChange={(e) => onUpdate({ ...config, width: e.target.value })}
            className={styles.select}
          >
            <option value="100%">Full width</option>
            <option value="75%">75%</option>
            <option value="50%">50%</option>
            <option value="auto">Auto</option>
          </select>
        </label>
      </div>

      <div className={styles.settingsGroup}>
        <label className={styles.label}>
          <span>Border Radius</span>
          <select
            value={(config.borderRadius as string) || "md"}
            onChange={(e) => onUpdate({ ...config, borderRadius: e.target.value })}
            className={styles.select}
          >
            <option value="none">None</option>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="full">Full (Circle)</option>
          </select>
        </label>
      </div>
    </>
  );
};

