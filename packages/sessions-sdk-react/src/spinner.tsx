import { ProgressBar } from "react-aria-components";

import styles from "./spinner.module.css";

export const Spinner = () => (
  <div className={styles.spinnerContainer}>
    <ProgressBar
      className={styles.spinner ?? ""}
      aria-label="Loading"
      isIndeterminate
    />
  </div>
);
