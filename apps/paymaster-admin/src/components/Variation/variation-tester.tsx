import type { Variation } from "../../db-schema"
import { TextField } from "@fogo/component-library/TextField";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@fogo/component-library/Button";
import { Badge } from "@fogo/component-library/Badge";
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react/dist/ssr";
import styles from "./variation-tester.module.scss";

type VariationTesterProps = {
  domain: string;
  variation: Variation;
};

export const VariationTester = (props: VariationTesterProps) => {
  const [transaction, setTransaction] = useState("");
  const [validationResult, setValidationResult] = useState<'valid' | 'invalid' | null>(null);
  const [validationMessage, setValidationMessage] = useState<string>("");

  useEffect(() => {
    setValidationResult(null);
    setValidationMessage("");
  }, [transaction]);

  useEffect(() => {
    setValidationResult(null);
    setValidationMessage("");
  }, [props.variation.transaction_variation]);

  const handleTest = useCallback(async () => {
    try {
      const response = await fetch('/api/validate-transaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction,
          domain: props.domain,
          variation: props.variation,
        })
      });

      const data = await response.json();

      if (data.success) {
        setValidationResult('valid');
        setValidationMessage(data.message);
      } else {
        setValidationResult('invalid');
        setValidationMessage(data.message);
      }
    } catch (error) {
      setValidationResult('invalid');
      setValidationMessage(`Error validating transaction: ${(error as Error).message}`);
    }
  }, [props.variation, transaction]);

  return (
    <div className={styles.variationTester ?? ""}>
      <div className={styles.variationTesterInputRow ?? ""}>
        <TextField
          value={transaction}
          onChange={setTransaction}
          placeholder="Enter serialized tx or tx hash"
          double={true}
          className={styles.variationTesterInput ?? ""}
        />
        <Button variant="secondary" onClick={handleTest}>
          Test
        </Button>
      </div>
      {validationResult && validationMessage && (
        <div
          className={styles.variationTesterOutput ?? ""}
        >
          <Badge
            variant={validationResult === 'valid' ? 'success' : 'error'}
            size="xs"
          >
            {validationResult === 'valid' ? (
              <CheckCircleIcon weight="duotone" />
            ) : (
              <XCircleIcon weight="duotone" />
            )}
          </Badge>
          <span className={styles.variationTesterOutputMessage ?? ""}>
            {validationMessage}
          </span>
        </div>
      )}
    </div>
  )
}