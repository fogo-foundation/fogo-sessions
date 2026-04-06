import { Button } from "@fogo/component-library/Button";

import styles from "./index.module.scss";

export const NotFound = () => (
  <main className={styles.notFound}>
    <h1 className={styles.header}>Not Found</h1>
    <p className={styles.subheader}>
      {"The page you're looking for isn't here"}
    </p>
    <Button href="/" variant="outline" size="lg">
      Go Home
    </Button>
  </main>
);
