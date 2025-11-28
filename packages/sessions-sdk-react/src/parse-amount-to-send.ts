import { stringToAmount } from "./amount-to-string.js";

/**
 * Parse the amount to send from the form input.
 * @param props - The form input props
 * @param decimals - The number of decimals for the token
 * @returns The parsed amount to send or undefined if invalid
 */
export const parseAmountToSend = (
  props: { isLoading?: boolean; amount?: string },
  decimals: number,
): bigint | undefined => {
  if (props.isLoading || !props.amount) {
    return undefined;
  }
  try {
    return stringToAmount(props.amount, decimals);
  } catch {
    return undefined;
  }
};