export const stringToAmount = (str: string, decimals: number): bigint => {
  const parts = str.split('.');
  const integerStr = parts[0];
  const fractionalStr = parts[1];
  if (parts.length > 2 || integerStr === undefined) {
    throw new Error('Invalid amount string');
  } else {
    const integerPart = BigInt(integerStr) * 10n ** BigInt(decimals);
    if (fractionalStr === undefined) {
      return integerPart;
    } else {
      if (fractionalStr.length > decimals) {
        throw new Error('This value is more precise than the token supports');
      } else {
        const fractionalPart = BigInt(fractionalStr.padEnd(decimals, '0'));
        return integerPart + fractionalPart;
      }
    }
  }
};

export const amountToString = (amount: bigint, decimals: number): string => {
  const asStr = amount.toString();
  const whole =
    asStr.length > decimals ? asStr.slice(0, asStr.length - decimals) : '0';
  const decimal =
    asStr.length > decimals ? asStr.slice(asStr.length - decimals) : asStr;
  const decimalPadded = decimal.padStart(decimals, '0');
  const decimalTruncated = decimalPadded.replace(/0+$/, '');

  return [
    whole,
    ...(decimalTruncated === '' ? [] : ['.', decimalTruncated]),
  ].join('');
};
