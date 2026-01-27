"use client";
import { isEstablished, useSession } from "@fogo/sessions-sdk-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "./index.module.scss";

export const Onboard = () => {
  const router = useRouter();
  const session = useSession();
  const [formData, setFormData] = useState({
    username: "",
    displayName: "",
    bio: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setIsSubmitting(true);
    if (!isEstablished(session)) {
      setErrors({ general: "Please connect your wallet first" });
      setIsSubmitting(false);
      return;
    }
    try {
      const token = await session.createLogInToken();
      const response = await fetch("/api/creator/onboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
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
          setErrors({ general: data.error || "Failed to create profile" });
        }
        setIsSubmitting(false);
        return;
      }

      router.push("/dashboard");
    } catch {
      setErrors({ general: "An unexpected error occurred" });
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.onboard}>
      <div className={styles.onboardCard}>
        <h1 className={styles.title}>Create Your Creator Profile</h1>
        <p className={styles.description}>
          Set up your profile to start building token-gated content
        </p>

        {errors.general && <div className={styles.error}>{errors.general}</div>}

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.field}>
            <label htmlFor="username" className={styles.label}>
              Username *
            </label>
            <input
              id="username"
              type="text"
              value={formData.username}
              onChange={(e) =>
                setFormData({ ...formData, username: e.target.value })
              }
              className={styles.input}
              placeholder="your-username"
              required
              pattern="[a-z0-9_-]+"
              title="Lowercase letters, numbers, underscores, and hyphens only"
            />
            {errors.username && (
              <span className={styles.fieldError}>{errors.username}</span>
            )}
            <p className={styles.helpText}>
              This will be your unique URL: fogueira.io/
              {formData.username || "username"}
            </p>
          </div>

          <div className={styles.field}>
            <label htmlFor="displayName" className={styles.label}>
              Display Name *
            </label>
            <input
              id="displayName"
              type="text"
              value={formData.displayName}
              onChange={(e) =>
                setFormData({ ...formData, displayName: e.target.value })
              }
              className={styles.input}
              placeholder="Your Display Name"
              required
            />
            {errors.displayName && (
              <span className={styles.fieldError}>{errors.displayName}</span>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="bio" className={styles.label}>
              Bio
            </label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) =>
                setFormData({ ...formData, bio: e.target.value })
              }
              className={styles.textarea}
              placeholder="Tell us about yourself..."
              rows={4}
              maxLength={500}
            />
            <p className={styles.helpText}>
              {formData.bio.length}/500 characters
            </p>
          </div>

          <button
            type="submit"
            className={styles.submitButton}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Creating..." : "Create Profile"}
          </button>
        </form>
      </div>
    </div>
  );
};
