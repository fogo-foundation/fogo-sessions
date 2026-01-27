import { Link } from "@fogo/component-library/Link";
import styles from "./index.module.scss";

export const Footer = () => (
  <footer className={styles.footer}>
    <div className={styles.footerContent}>
      <div>
        <p className={styles.footerText}>
          Fogueira - Token-Gated Membership Platform
        </p>
        <p className={styles.footerSubtext}>
          Powered by Fogo Sessions
        </p>
      </div>
      <div className={styles.footerLinks}>
        <Link
          href="https://fogo.io"
          target="_blank"
        >
          About Fogo
        </Link>
      </div>
    </div>
  </footer>
);

