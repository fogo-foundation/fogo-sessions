import { Badge } from "@fogo/component-library/Badge";
import { Button } from "@fogo/component-library/Button";
import { TextField } from "@fogo/component-library/TextField";
import { StateType, useAsync } from "@fogo/component-library/useAsync";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useMemo, useState } from "react";
import type { Variation } from "../../db-schema";
import { normalizeVersionedTransactionBase64 } from "../../lib/transactions";
import styles from "./variation-tester.module.scss";

type ValidationResult = { success: boolean; message: string };

type VariationTesterProps = {
  domain: string;
  variation?: Variation | null;
};

export const VariationTester = ({
  domain,
  variation,
}: VariationTesterProps) => {
  const [transactionInput, setTransactionInput] = useState("");
  const transactionParsed = useMemo(
    () => normalizeVersionedTransactionBase64(transactionInput),
    [transactionInput],
  );

  const { state, execute } = useAsync<ValidationResult>(
    useCallback(async () => {
      if (!variation) {
        return {
          success: false,
          message: "Variation is invalid. Fix the configuration to test.",
        };
      }
      if (!transactionParsed) {
        return {
          success: false,
          message:
            "Transaction is invalid. Please enter a valid base64 transaction.",
        };
      }
      const response = await fetch("/api/validate-transaction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transaction: transactionParsed,
          domain,
          variation,
        }),
      });
      return response.json();
    }, [transactionParsed, domain, variation]),
  );

  const handleTransactionChange = useCallback((value: string) => {
    setTransactionInput(value);
  }, []);

  const isComplete = state.type === StateType.Complete;
  const isError = state.type === StateType.Error;
  const isLoading = state.type === StateType.Running;

  return (
    <div>
      <div className={styles.variationTesterInputRow}>
        <TextField
          value={transactionInput}
          onChange={handleTransactionChange}
          placeholder="Enter serialized tx"
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
