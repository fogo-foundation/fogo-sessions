import * as dnum from "dnum";

/**
 * Calculate the notional (USD) value of a token amount
 * @param amount - The token amount as a bigint
 * @param decimals - The number of decimals for the token
 * @param price - The price per token as a number
 * @returns A tuple of [value, decimals] for use with dnum, or undefined if price is undefined
 */
export const calculateNotional = (
  amount: bigint,
  decimals: number,
  price: number,
): [bigint, number] | undefined => {
  const [priceValue, priceDecimals] = dnum.from(price);

  return [amount * priceValue, decimals + priceDecimals];
};
