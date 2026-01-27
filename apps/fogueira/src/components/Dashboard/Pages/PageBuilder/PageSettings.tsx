"use client";
import { SessionStateType, useSession } from "@fogo/sessions-sdk-react";
import { Image, Trash, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useState } from "react";
import styles from "./PageSettings.module.scss";

type Page = {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  gatingRuleId: string | null;
  bgImage?: string | null;
  bgColor?: string | null;
  overlayColor?: string | null;
  fullWidth?: boolean;
};

type GatingRule = {
  id: string;
  name: string;
};

type Props = {
  page: Page;
  onClose: () => void;
  onUpdate: () => void;
  onSettingsChange?: (settings: {
    bgImage: string | null;
    bgColor: string | null;
    overlayColor: string | null;
    fullWidth: boolean;
  }) => void;
};

export const PageSettings = ({
  page,
  onClose,
  onUpdate,
  onSettingsChange,
}: Props) => {
  const session = useSession();
  const [gatingRules, setGatingRules] = useState<GatingRule[]>([]);
  const [selectedRuleId, setSelectedRuleId] = useState<string>(
    page.gatingRuleId || "",
  );
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  const [bgImage, setBgImage] = useState(page.bgImage || "");
  const [bgColor, setBgColor] = useState(page.bgColor || "");
  const [overlayColor, setOverlayColor] = useState(page.overlayColor || "");
  const [fullWidth, setFullWidth] = useState(page.fullWidth || false);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchGatingRules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchGatingRules = async () => {
    if (session.type !== SessionStateType.Established) return;

    try {
      const token = await session.createLogInToken();
      const response = await fetch("/api/creator/gating-rules", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setGatingRules(data.rules || []);
      }
    } catch {
      // Silently fail
    }
  };

  const handleBgImageUpload = async (file: File) => {
    if (session.type !== SessionStateType.Established) return;
    setUploading(true);

    try {
      const token = await session.createLogInToken();

      // Get upload URL
      const uploadResponse = await fetch("/api/creator/uploads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
        }),
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to get upload URL");
      }

      const { uploadUrl, blobUrl } = await uploadResponse.json();

      // Upload to blob storage
      const blobResponse = await fetch(uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type,
        },
        body: file,
      });

      if (!blobResponse.ok) {
        throw new Error("Failed to upload image");
      }

      setBgImage(blobUrl);
      // Immediately update preview
      if (onSettingsChange) {
        onSettingsChange({
          bgImage: blobUrl,
          bgColor,
          overlayColor,
          fullWidth,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Helper to update settings immediately with current state
  const updateSettingsImmediately = useCallback(() => {
    if (onSettingsChange) {
      onSettingsChange({
        bgImage: bgImage || null,
        bgColor: bgColor || null,
        overlayColor: overlayColor || null,
        fullWidth,
      });
    }
  }, [onSettingsChange, bgImage, bgColor, overlayColor, fullWidth]);

  const handleSave = async () => {
    if (session.type !== SessionStateType.Established) return;

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    if (!slug.trim()) {
      setError("Slug is required");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const token = await session.createLogInToken();
      const response = await fetch(`/api/creator/pages/${page.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          gatingRuleId: selectedRuleId || null,
          bgImage: bgImage || null,
          bgColor: bgColor || null,
          overlayColor: overlayColor || null,
          fullWidth,
        }),
      });

      if (response.ok) {
        onUpdate();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || "Failed to save settings");
      }
    } catch {
      setError("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Page Settings</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
            title="Close"
          >
            <X weight="bold" />
          </button>
        </div>

        <div className={styles.content}>
          <div className={styles.group}>
            <label className={styles.label}>
              <span>Title</span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={styles.input}
              />
            </label>
          </div>

          <div className={styles.group}>
            <label className={styles.label}>
              <span>Slug</span>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                disabled={page.isHome}
                className={styles.input}
              />
            </label>
            {page.isHome && (
              <p className={styles.hint}>
                The home page slug cannot be changed.
              </p>
            )}
          </div>

          <div className={styles.group}>
            <label className={styles.label}>
              <span>Token Gating</span>
              <select
                value={selectedRuleId}
                onChange={(e) => setSelectedRuleId(e.target.value)}
                className={styles.select}
              >
                <option value="">No gating (public)</option>
                {gatingRules.map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.name}
                  </option>
                ))}
              </select>
            </label>
            <p className={styles.hint}>
              {selectedRuleId
                ? "Only users who meet the rule requirements can view this page."
                : "Anyone can view this page."}
            </p>
            {gatingRules.length === 0 && (
              <p className={styles.hint}>
                No gating rules available.{" "}
                <a href="/dashboard/gating-rules" className={styles.link}>
                  Create one
                </a>
              </p>
            )}
          </div>

          <div className={styles.divider} />
          <h3 className={styles.sectionTitle}>Appearance</h3>

          <div className={styles.group}>
            <label className={styles.label}>
              <span>Background Image</span>
            </label>
            {bgImage ? (
              <div className={styles.imagePreview}>
                <img src={bgImage} alt="Background preview" />
                <button
                  type="button"
                  onClick={() => {
                    setBgImage("");
                    updateSettingsImmediately();
                  }}
                  className={styles.removeImageButton}
                  title="Remove image"
                >
                  <Trash weight="bold" />
                </button>
              </div>
            ) : (
              <label className={styles.uploadArea}>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleBgImageUpload(file);
                  }}
                  className={styles.fileInput}
                  disabled={uploading}
                />
                <Image size={24} />
                <span>
                  {uploading
                    ? "Uploading..."
                    : "Click to upload background image"}
                </span>
              </label>
            )}
          </div>

          <div className={styles.group}>
            <label className={styles.label}>
              <span>Background Color</span>
              <div className={styles.colorInputWrapper}>
                <input
                  type="color"
                  value={bgColor || "#0a0a0f"}
                  onChange={(e) => {
                    setBgColor(e.target.value);
                    updateSettingsImmediately();
                  }}
                  className={styles.colorPicker}
                />
                <input
                  type="text"
                  value={bgColor}
                  onChange={(e) => {
                    setBgColor(e.target.value);
                    updateSettingsImmediately();
                  }}
                  placeholder="#0a0a0f"
                  className={styles.input}
                />
                {bgColor && (
                  <button
                    type="button"
                    onClick={() => {
                      setBgColor("");
                      updateSettingsImmediately();
                    }}
                    className={styles.clearButton}
                    title="Clear"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </label>
            <p className={styles.hint}>
              Used when no background image is set, or as fallback.
            </p>
          </div>

          <div className={styles.group}>
            <label className={styles.label}>
              <span>Overlay Color</span>
              <div className={styles.colorInputWrapper}>
                <input
                  type="color"
                  value={
                    overlayColor
                      ? overlayColor.replace(/[^#0-9a-fA-F]/g, "").slice(0, 7)
                      : "#000000"
                  }
                  onChange={(e) => {
                    setOverlayColor(e.target.value + "80");
                    updateSettingsImmediately();
                  }}
                  className={styles.colorPicker}
                />
                <input
                  type="text"
                  value={overlayColor}
                  onChange={(e) => {
                    setOverlayColor(e.target.value);
                    updateSettingsImmediately();
                  }}
                  placeholder="rgba(0,0,0,0.5) or #00000080"
                  className={styles.input}
                />
                {overlayColor && (
                  <button
                    type="button"
                    onClick={() => {
                      setOverlayColor("");
                      updateSettingsImmediately();
                    }}
                    className={styles.clearButton}
                    title="Clear"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </label>
            <p className={styles.hint}>
              Semi-transparent overlay on top of background image (include
              opacity).
            </p>
          </div>

          <div className={styles.group}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={fullWidth}
                onChange={(e) => {
                  setFullWidth(e.target.checked);
                  updateSettingsImmediately();
                }}
                className={styles.checkbox}
              />
              <span>Full Width Content</span>
            </label>
            <p className={styles.hint}>
              When enabled, content stretches edge to edge. Otherwise, content
              is contained within a max-width.
            </p>
          </div>

          {error && <p className={styles.error}>{error}</p>}

          <div className={styles.actions}>
            <button onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={styles.saveButton}
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

