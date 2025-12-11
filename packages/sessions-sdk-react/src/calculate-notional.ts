import * as dnum from "dnum";

/**
 * Calculate the notional (USD) value of a token amount
 * @param amount - The token amount as a bigint
 * @param decimals - The number of decimals for the token
 * @param price - The price per token as a number
 * @returns The product as a Dnum
 */
export const calculateNotional = (
  amount: bigint,
  decimals: number,
  price: number,
): dnum.Dnum => {
  const priceDnum = dnum.from(price);
  const amountDnum = dnum.from([amount, decimals]);
  return dnum.multiply(amountDnum, priceDnum);
};
