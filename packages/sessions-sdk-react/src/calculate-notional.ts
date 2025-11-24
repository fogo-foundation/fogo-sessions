/**
 * Convert a number to a bigint with decimals for precise calculations
 * @param value - The number to convert
 * @returns A tuple of [bigint value, number of decimals]
 */
export const convertToScientific = (value: number): [bigint, number] => {
  const valueStr = value.toString();
  const decimalIndex = valueStr.indexOf('.');
  const decimals = decimalIndex === -1 ? 0 : valueStr.length - decimalIndex - 1;

  const bigintValue = BigInt(valueStr.replace('.', ''));

  return [bigintValue, decimals];
};

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
  price: number | undefined,
): [bigint, number] | undefined => {
  if (price === undefined) {
    return undefined;
  }

  const [priceValue, priceDecimals] = convertToScientific(price);

  return [amount * priceValue, decimals + priceDecimals];
};
