import { Badge } from "@fogo/component-library/Badge";
import { Button } from "@fogo/component-library/Button";
import { TextField } from "@fogo/component-library/TextField";
import { StateType, useAsync } from "@fogo/component-library/useAsync";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useMemo, useState } from "react";
import type { Variation } from "../../db-schema";
import { parseTransactionInput } from "../../lib/transactions";
import styles from "./variation-tester.module.scss";

type ValidationResult = { success: boolean; message: string };

type VariationTesterProps = {
  domain: string;
  networkEnvironment: string;
  variation?: Variation | null;
};

function variationsEqual(
  variation1: Variation,
  variation2: Variation,
): boolean {
  const { updated_at: _updatedAt1, ...rest1 } = variation1;
  const { updated_at: _updatedAt2, ...rest2 } = variation2;
  return JSON.stringify(rest1) === JSON.stringify(rest2);
}

export const VariationTester = ({
  domain,
  networkEnvironment,
  variation,
}: VariationTesterProps) => {
  const [transactionInput, setTransactionInput] = useState("");
  const [validatedInput, setValidatedInput] = useState("");
  const [validatedVariation, setValidatedVariation] =
    useState<Variation | null>(null);

  const parsedInput = useMemo(() => {
    try {
      return parseTransactionInput(transactionInput);
    } catch {
      return null;
    }
  }, [transactionInput]);

  const { state, execute: executeAsync } = useAsync<ValidationResult>(
    useCallback(async () => {
      const response = await fetch("/api/validate-transaction", {
        body: JSON.stringify({
          domain,
          network: networkEnvironment,
          transactionInput: parsedInput?.value ?? transactionInput.trim(),
          variation,
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      return response.json();
    }, [transactionInput, domain, networkEnvironment, variation]),
  );

  const execute = useCallback(() => {
    setValidatedInput(transactionInput);
    setValidatedVariation(variation ?? null);
    executeAsync();
  }, [transactionInput, variation, executeAsync]);

  const handleTransactionChange = useCallback((value: string) => {
    setTransactionInput(value);
  }, []);

  const variationsMatch = useMemo(
    () =>
      !!variation &&
      !!validatedVariation &&
      variationsEqual(variation, validatedVariation),
    [variation, validatedVariation],
  );

  const showResult = transactionInput === validatedInput && variationsMatch;
  const isComplete = showResult && state.type === StateType.Complete;
  const isError = showResult && state.type === StateType.Error;
  const isLoading = state.type === StateType.Running;

  return (
    <div>
      <div className={styles.variationTesterInputRow}>
        <TextField
          className={styles.variationTesterInput ?? ""}
          double={true}
          onChange={handleTransactionChange}
          placeholder="Enter serialized transaction (base64) or transaction hash"
          value={transactionInput}
        />
        <Button
          isDisabled={isLoading || !variation || !parsedInput}
          onClick={execute}
          variant="secondary"
        >
          Test
        </Button>
      </div>
      {transactionInput && !parsedInput && (
        <span className={styles.variationTesterError ?? ""}>
          Input must be a valid serialized transaction (base64) or transaction
          hash
        </span>
      )}
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
