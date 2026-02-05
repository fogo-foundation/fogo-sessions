import { Badge } from "@fogo/component-library/Badge";
import { Button } from "@fogo/component-library/Button";
import { TextField } from "@fogo/component-library/TextField";
import { StateType, useAsync } from "@fogo/component-library/useAsync";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useState } from "react";
import styles from "./variation-tester.module.scss";

type ValidationResult = { success: boolean; message: string };

type VariationTesterProps = {
  domain: string;
  // TODO: we should parse this earlier into a Variation type
  variation: string;
};

export const VariationTester = ({
  domain,
  variation,
}: VariationTesterProps) => {
  const [transaction, setTransaction] = useState("");

  const { state, execute } = useAsync<ValidationResult>(
    useCallback(async () => {
      const response = await fetch("/api/validate-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction,
          domain,
          variation,
        }),
      });
      return response.json();
    }, [transaction, domain, variation]),
  );

  const handleTransactionChange = useCallback((value: string) => {
    setTransaction(value);
  }, []);

  const isComplete = state.type === StateType.Complete;
  const isError = state.type === StateType.Error;
  const isLoading = state.type === StateType.Running;

  return (
    <div>
      <div className={styles.variationTesterInputRow}>
        <TextField
          value={transaction}
          onChange={handleTransactionChange}
          placeholder="Enter serialized tx or tx hash"
          double={true}
          className={styles.variationTesterInput ?? ""}
        />
        <Button variant="secondary" onClick={execute} isDisabled={isLoading}>
          Test
        </Button>
      </div>
      {isComplete && (
        <div className={styles.variationTesterOutput}>
          <Badge variant={state.result.success ? "success" : "error"} size="xs">
            {state.result.success ? (
              <CheckCircleIcon weight="duotone" />
            ) : (
              <XCircleIcon weight="duotone" />
            )}
          </Badge>
          <span className={styles.variationTesterOutputMessage}>
            {state.result.message}
          </span>
        </div>
      )}
      {isError && (
        <div className={styles.variationTesterOutput}>
          <Badge variant="error" size="xs">
            <XCircleIcon weight="duotone" />
          </Badge>
          <span className={styles.variationTesterOutputMessage}>
            {state.error instanceof Error
              ? state.error.message
              : "Unknown error"}
          </span>
        </div>
      )}
    </div>
  );
};
