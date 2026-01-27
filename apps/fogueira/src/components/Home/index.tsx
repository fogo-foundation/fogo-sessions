import { Features } from "../Landing/Features";
import { Hero } from "../Landing/Hero";
import { HowItWorks } from "../Landing/HowItWorks";
import styles from "./index.module.scss";

export const Home = () => {
  return (
    <div className={styles.home}>
      <Hero />
      <Features />
      <HowItWorks />
    </div>
  );
};
