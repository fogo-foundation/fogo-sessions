"use client";
import styles from "./ButtonWidget.module.scss";

type Props = {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
};

export const ButtonWidget = ({ config }: Props) => {
  const text = (config.text as string) || "Click me";
  const url = (config.url as string) || "";
  const variant = (config.variant as string) || "primary";
  const size = (config.size as string) || "md";
  const alignment = (config.alignment as string) || "left";

  const getVariantClass = () => {
    switch (variant) {
      case "secondary":
        return styles.secondary;
      case "outline":
        return styles.outline;
      case "ghost":
        return styles.ghost;
      default:
        return styles.primary;
    }
  };

  const getSizeClass = () => {
    switch (size) {
      case "sm":
        return styles.sm;
      case "lg":
        return styles.lg;
      default:
        return styles.md;
    }
  };

  return (
    <div className={styles.container} style={{ textAlign: alignment as "left" | "center" | "right" }}>
      <a
        href={url || "#"}
        className={`${styles.button} ${getVariantClass()} ${getSizeClass()}`}
        target={url.startsWith("http") ? "_blank" : undefined}
        rel={url.startsWith("http") ? "noopener noreferrer" : undefined}
        onClick={(e) => {
          if (!url) e.preventDefault();
        }}
      >
        {text || "Button"}
      </a>
    </div>
  );
};

