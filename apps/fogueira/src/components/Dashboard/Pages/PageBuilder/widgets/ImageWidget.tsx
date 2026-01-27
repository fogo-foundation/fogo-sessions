"use client";
import { Image as ImageIcon } from "@phosphor-icons/react";
import styles from "./ImageWidget.module.scss";

type Props = {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
};

export const ImageWidget = ({ config }: Props) => {
  const url = config.url as string | undefined;
  const alt = config.alt as string | undefined;

  if (!url) {
    return (
      <div className={styles.placeholder}>
        <ImageIcon size={32} weight="light" />
        <span>Click the gear icon to add an image</span>
      </div>
    );
  }

  return (
    <div className={styles.widget}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={alt || "Image"} className={styles.image} />
    </div>
  );
};

