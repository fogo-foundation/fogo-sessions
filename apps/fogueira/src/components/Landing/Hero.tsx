import Link from "next/link";
import styles from "./Hero.module.scss";

export const Hero = () => {
  return (
    <section className={styles.hero}>
      <div className={styles.heroContent}>
        <h1 className={styles.heroTitle}>
          Empower Your Community with Token-Gated Content
        </h1>
        <p className={styles.heroDescription}>
          Create exclusive content, build membership communities, and monetize
          your work with NFT-based access control. All powered by Fogo Sessions
          for a seamless, gasless experience.
        </p>
        <div className={styles.heroActions}>
          <Link href="/dashboard/onboard" className={styles.primaryButton}>
            Start Creating
          </Link>
          <Link href="#explore" className={styles.secondaryButton}>
            Explore Creators
          </Link>
        </div>
      </div>
    </section>
  );
};

