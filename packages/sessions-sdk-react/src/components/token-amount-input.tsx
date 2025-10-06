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
  ...props
}: ComponentProps<typeof TextField> &
  Parameters<typeof useTokenAmountInput>[0]) => (
  <TextField
    {...useTokenAmountInput({ decimals, symbol, min, max, gt, lt })}
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
}: {
  decimals: number;
  symbol?: string | undefined;
  min?: bigint | undefined;
  max?: bigint | undefined;
  gt?: bigint | undefined;
  lt?: bigint | undefined;
}) => {
  const validate = useCallback(
    (value: string) => {
      if (value) {
        try {
          const amount = stringToAmount(value, decimals);
          if (gt !== undefined && amount <= gt) {
            return `Must be greater than ${amountToString(gt, decimals).toString()} ${symbol}`;
          } else if (lt !== undefined && amount >= lt) {
            return `Must be less than ${amountToString(lt, decimals).toString()} ${symbol}`;
          } else if (max !== undefined && amount > max) {
            return `Cannot be more than ${amountToString(max, decimals).toString()} ${symbol}`;
          } else if (min !== undefined && amount < min) {
            return `Cannot be less than ${amountToString(min, decimals).toString()} ${symbol}`;
          } else {
            return;
          }
        } catch (error: unknown) {
          return errorToString(error);
        }
      } else {
        return;
      }
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
