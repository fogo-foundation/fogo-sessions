"use client";
import { Link } from "@fogo/component-library/Link";
import { SessionButton } from "@fogo/sessions-sdk-react";
import Image from "next/image";
import fogoPaymasterLabelSvg from "./fogo-paymaster-label.svg";
import styles from "./index.module.scss";
import paymasterSvg from "./paymaster.svg";
import paymasterLabelSvg from "./paymaster-label.svg";

const TermsOfServiceLink = ({
  className,
}: {
  className?: string | undefined;
}) => (
  <Link
    href="https://www.dourolabs.xyz/Paymaster-Terms-Of-Service.pdf"
    target="_blank"
    rel="noopener noreferrer"
    className={className ?? ""}
  >
    Terms of Service
  </Link>
);

const PrivacyPolicyLink = ({
  className,
}: {
  className?: string | undefined;
}) => (
  <Link
    href="https://www.dourolabs.xyz/Privacy-Notice.pdf"
    target="_blank"
    rel="noopener noreferrer"
    className={className ?? ""}
  >
    Privacy Notice
  </Link>
);

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
        <p className={styles.connectWalletCardInfo}>
          By connecting your wallet and/or using Paymaster you hereby agree to
          our <TermsOfServiceLink /> and <PrivacyPolicyLink />.
        </p>
      </div>
      <div className={styles.authCardFooter}>
        <div className={styles.authCardFooterContent}>
          <Image src={paymasterLabelSvg} alt="Paymaster" />
          <p className={styles.authCardFooterSubtitle}>by Douro Labs</p>
        </div>
        <div className={styles.authCardFooterContent} data-align="right">
          <TermsOfServiceLink className={styles.authCardFooterLink} />
          <PrivacyPolicyLink className={styles.authCardFooterLink} />
        </div>
      </div>
    </div>
  </>
);
