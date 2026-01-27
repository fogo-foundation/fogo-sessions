"use client";
import { SessionStateType, useSession } from "@fogo/sessions-sdk-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./index.module.scss";

export const NewPagePage = () => {
  const session = useSession();
  const router = useRouter();
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    isHome: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleTitleChange = (value: string) => {
    setFormData((prev) => ({ ...prev, title: value }));
    // Auto-generate slug from title
    if (!formData.slug || formData.slug === generateSlug(formData.title)) {
      setFormData((prev) => ({
        ...prev,
        slug: generateSlug(value),
      }));
    }
    if (errors.title) {
      setErrors((prev) => ({ ...prev, title: "" }));
    }
  };

  const handleSlugChange = (value: string) => {
    const slug = value.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setFormData((prev) => ({ ...prev, slug }));
    if (errors.slug) {
      setErrors((prev) => ({ ...prev, slug: "" }));
    }
  };

  const generateSlug = (text: string): string => {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    if (session.type !== SessionStateType.Established) {
      setErrors({ form: "Session not established" });
      setSubmitting(false);
      return;
    }

    try {
      const token = await session.createLogInToken();
      const response = await fetch("/api/creator/pages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        if (data.details) {
          const fieldErrors: Record<string, string> = {};
          for (const error of data.details) {
            if (error.path) {
              fieldErrors[error.path[0]] = error.message;
            }
          }
          setErrors(fieldErrors);
        } else {
          setErrors({ form: data.error || "Failed to create page" });
        }
        setSubmitting(false);
        return;
      }

      const data = await response.json();
      router.push(`/dashboard/pages/${data.page.id}`);
    } catch {
      setErrors({ form: "Failed to create page" });
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>Create New Page</h1>
        <p className={styles.subtitle}>
          Start building your token-gated page
        </p>
      </div>

      <form onSubmit={handleSubmit} className={styles.form}>
        {errors.form && (
          <div className={styles.errorMessage}>{errors.form}</div>
        )}

        <div className={styles.field}>
          <label htmlFor="title" className={styles.label}>
            Page Title *
          </label>
          <input
            id="title"
            type="text"
            value={formData.title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="My Awesome Page"
            required
            className={styles.input}
          />
          {errors.title && (
            <span className={styles.errorText}>{errors.title}</span>
          )}
        </div>

        <div className={styles.field}>
          <label htmlFor="slug" className={styles.label}>
            URL Slug *
          </label>
          <div className={styles.slugInput}>
            <span className={styles.slugPrefix}>/</span>
            <input
              id="slug"
              type="text"
              value={formData.slug}
              onChange={(e) => handleSlugChange(e.target.value)}
              placeholder="my-awesome-page"
              required
              className={styles.input}
            />
          </div>
          {errors.slug && (
            <span className={styles.errorText}>{errors.slug}</span>
          )}
          <p className={styles.helpText}>
            Only lowercase letters, numbers, and hyphens allowed
          </p>
        </div>

        <div className={styles.field}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={formData.isHome}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, isHome: e.target.checked }))
              }
              className={styles.checkbox}
            />
            <span>Set as home page</span>
          </label>
          <p className={styles.helpText}>
            The home page will be displayed at your creator URL root
          </p>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => router.back()}
            className={styles.cancelButton}
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={styles.submitButton}
            disabled={submitting || !formData.title || !formData.slug}
          >
            {submitting ? "Creating..." : "Create Page"}
          </button>
        </div>
      </form>
    </div>
  );
};

