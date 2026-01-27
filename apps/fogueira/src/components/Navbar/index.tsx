import { SessionButton } from "@fogo/sessions-sdk-react";
import Link from "next/link";
import styles from "./index.module.scss";

export const Navbar = () => {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContent}>
        <Link href="/" className={styles.logo}>
          Fogueira
        </Link>
        <div className={styles.navLinks}>
          <Link href="/dashboard" className={styles.navLink}>
            Dashboard
          </Link>
          <SessionButton />
        </div>
      </div>
    </nav>
  );
};

