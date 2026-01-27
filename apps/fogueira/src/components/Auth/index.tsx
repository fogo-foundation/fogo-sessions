"use client";
import { SessionButton } from "@fogo/sessions-sdk-react";
import styles from "./index.module.scss";

export const Auth = () => (
  <>
    <video
      src="/auth-background.mp4"
      autoPlay
      muted
      loop
      className={styles.authVideoBackground}
    />
    <div className={styles.authCard}>
      <h1 className={styles.authCardTitle}>Fogueira</h1>
      <p className={styles.authCardDescription}>
        Empower Your Community with Token-Gated Content
      </p>
      <div className={styles.connectWalletCard}>
        <span className={styles.connectWalletCardHighlightLine} />
        <h2 className={styles.connectWalletCardTitle}>Get Started</h2>
        <p className={styles.connectWalletCardDescription}>
          Connect your wallet to start creating or exploring token-gated content.
        </p>
        <SessionButton />
      </div>
    </div>
  </>
);

