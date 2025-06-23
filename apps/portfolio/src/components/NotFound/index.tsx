import { Button } from "../Button";
import styles from "./index.module.scss";

export const NotFound = () => (
  <main className={styles.notFound}>
    <h1 className={styles.header}>Not Found</h1>
    <p className={styles.subheader}>
      {"The page you're looking for isn't here"}
    </p>
    <Button href="/">Go Home</Button>
  </main>
);
