"use client";
import { SessionButton } from "@fogo/sessions-sdk-react";
import Image from "next/image";
import fogoPaymasterLabelSvg from "./fogo-paymaster-label.svg";
import styles from "./index.module.scss";
import paymasterSvg from "./paymaster.svg";

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
      <Image
        src={fogoPaymasterLabelSvg}
        alt="Fogo Paymaster Label"
        className={styles.fogoPaymasterLabel}
      />
      <p className={styles.authCardDescription}>
        Your backstage pass to seamless gas on-chain.
      </p>
      <Image
        src={paymasterSvg}
        alt="Paymaster"
        className={styles.paymasterImage}
      />
      <div className={styles.connectWalletCard}>
        <span className={styles.connectWalletCardHighlightLine} />
        <h1 className={styles.connectWalletCardTitle}>Get Started</h1>
        <p className={styles.connectWalletCardDescription}>
          Fogo Sessions enables seamless authorization.
        </p>
        <SessionButton />
      </div>
    </div>
  </>
);
