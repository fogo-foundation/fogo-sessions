import { SessionButton } from "@fogo/sessions-sdk-react";
import Image from "next/image";
import fogoNavImageSvg from "./fogo-paymaster-nav.svg";
import styles from "./index.module.scss";

export const Navbar = () => {
  return (
    <nav className={styles.nav}>
      <div className={styles.navContent}>
        <Image src={fogoNavImageSvg} alt="Fogo Paymaster" />
        <SessionButton />
      </div>
    </nav>
  );
};
