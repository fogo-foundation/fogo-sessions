"use client";
import styles from "./HeroWidget.module.scss";

type Props = {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
};

export const HeroWidget = ({ config }: Props) => {
  const imageUrl = (config.imageUrl as string) || "";
  const title = (config.title as string) || "";
  const subtitle = (config.subtitle as string) || "";
  const overlayOpacity = (config.overlayOpacity as number) || 0;
  const height = (config.height as string) || "100vh";

  const overlayStyle: React.CSSProperties = {
    backgroundColor: `rgba(0, 0, 0, ${overlayOpacity / 100})`,
  };

  const heroStyle: React.CSSProperties = {
    height: height,
  };

  return (
    <div className={styles.widget}>
      <div className={styles.hero} style={heroStyle}>
        {imageUrl && (
          <div className={styles.heroImage}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={title || "Hero"}
              className={styles.image}
            />
          </div>
        )}
        {overlayOpacity > 0 && (
          <div className={styles.heroOverlay} style={overlayStyle} />
        )}
        <div className={styles.heroContent}>
          {title && <h1 className={styles.heroTitle}>{title}</h1>}
          {subtitle && <p className={styles.heroSubtitle}>{subtitle}</p>}
        </div>
      </div>
    </div>
  );
};
