import { Link } from "@fogo/component-library/Link";
import Image from "next/image";
import styles from "./index.module.scss";
import fogoFooterImageSvg from "./paymaster.svg";

export const Footer = () => (
  <footer className={styles.footer}>
    <div className={styles.footerContent}>
      <div>
        <Image src={fogoFooterImageSvg} alt="Fogo Paymaster" />
        <p className={styles.footerText}>
          Software is maintained by Dourolabs.xyz
        </p>
      </div>
      <div>
        <Link href="https://dourolabs.xyz" target="_blank">
          Terms of Service
        </Link>
      </div>
    </div>
  </footer>
);
