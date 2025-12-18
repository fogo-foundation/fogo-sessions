import { Button } from "@fogo/component-library/Button";
import { useEffect } from "react";
import { useLogger } from "../../hooks/use-logger";
import styles from "./index.module.scss";

type Props = {
  error: Error & { digest?: string };
  reset?: () => void;
};

export const ErrorComponent = ({ error, reset }: Props) => {
  const logger = useLogger();

  useEffect(() => {
    logger.error(error);
  }, [error, logger]);

  return (
    <main className={styles.error}>
      <h1 className={styles.header}>Uh oh!</h1>
      <p className={styles.subheader}>{"Looks like we hit a snag"}</p>
      {reset && <Button onPress={reset}>Reset</Button>}
    </main>
  );
};
