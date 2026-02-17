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
  networkEnvironment: string;
  variation?: Variation | null;
};

export const VariationTester = ({
  domain,
  networkEnvironment,
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
          message: "Variation is invalid. Fix the configuration to test.",
          success: false,
        };
      }
      if (!transactionParsed) {
        return {
          message:
            "Transaction is invalid. Please enter a valid base64 transaction.",
          success: false,
        };
      }
      const response = await fetch("/api/validate-transaction", {
        body: JSON.stringify({
          domain,
          network: networkEnvironment,
          transaction: transactionParsed,
          variation,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      return response.json();
    }, [transactionParsed, domain, networkEnvironment, variation]),
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
          className={styles.variationTesterInput ?? ""}
          double={true}
          onChange={handleTransactionChange}
          placeholder="Enter serialized transaction (base64)"
          value={transactionInput}
        />
        <Button isDisabled={isLoading} onClick={execute} variant="secondary">
          Test
        </Button>
      </div>
      {isComplete && (
        <div className={styles.variationTesterOutput}>
          <Badge size="xs" variant={state.result.success ? "success" : "error"}>
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
          <Badge size="xs" variant="error">
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
