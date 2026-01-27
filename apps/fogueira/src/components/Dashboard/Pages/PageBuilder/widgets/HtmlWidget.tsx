"use client";
import { Code } from "@phosphor-icons/react";
import styles from "./HtmlWidget.module.scss";

type Props = {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
};

export const HtmlWidget = ({ config }: Props) => {
  const html = (config.html as string) || "";

  if (!html) {
    return (
      <div className={styles.placeholder}>
        <Code size={32} weight="light" />
        <span>Add custom HTML in settings</span>
      </div>
    );
  }

  // Sanitize and render HTML
  // Note: In production, you should use a proper HTML sanitizer like DOMPurify
  return (
    <div
      className={styles.container}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Custom HTML widget by design
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

