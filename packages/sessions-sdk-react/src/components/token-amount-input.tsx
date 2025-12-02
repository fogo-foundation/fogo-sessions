import type { ComponentProps } from "react";
import { useCallback, useMemo } from "react";

import { stringToAmount, amountToString } from "../amount-to-string.js";
import { errorToString } from "../error-to-string.js";
import { TextField } from "./field.js";

export const TokenAmountInput = ({
  decimals,
  symbol,
  min,
  max,
  gt,
  lt,
  onValidationChange,
  ...props
}: ComponentProps<typeof TextField> &
  Parameters<typeof useTokenAmountInput>[0]) => (
  <TextField
    {...useTokenAmountInput({ decimals, symbol, min, max, gt, lt, onValidationChange })}
    {...props}
  />
);

const useTokenAmountInput = ({
  decimals,
  symbol = "Tokens",
  min,
  max,
  gt,
  lt,
  onValidationChange,
}: {
  decimals: number;
  symbol?: string | undefined;
  min?: bigint | undefined;
  max?: bigint | undefined;
  gt?: bigint | undefined;
  lt?: bigint | undefined;
  onValidationChange?: ((error: string | undefined) => void) | undefined;
}) => {
  const validate = useCallback(
    (value: string) => {
      let error: string | undefined;

      if (value) {
        try {
          const amount = stringToAmount(value, decimals);
          if (gt !== undefined && amount <= gt) {
            error = `Must be greater than ${amountToString(gt, decimals).toString()} ${symbol}`;
          } else if (lt !== undefined && amount >= lt) {
            error = `Must be less than ${amountToString(lt, decimals).toString()} ${symbol}`;
          } else if (max !== undefined && amount > max) {
            error = `Cannot be more than ${amountToString(max, decimals).toString()} ${symbol}`;
          } else if (min !== undefined && amount < min) {
            error = `Cannot be less than ${amountToString(min, decimals).toString()} ${symbol}`;
          }
        } catch (e: unknown) {
          error = errorToString(e);
        }
      }

      onValidationChange?.(error);
      return error;
    },
    [decimals, gt, lt, max, min, symbol],
  );

  return useMemo(
    () => ({
      description: symbol,
      validate,
    }),
    [symbol, validate],
  );
};
