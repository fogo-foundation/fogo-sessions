const bigIntPow = (base: bigint, exponent: number): bigint => {
  if (exponent === 0) return BigInt(1);
  
  let result = BigInt(1);
  for (let i = 0; i < exponent; i++) {
    result *= base;
  }
  return result;
};

export const stringToAmount = (str: string, decimals: number): bigint => {
  if (!str || typeof str !== 'string' || decimals < 0) {
    throw new Error("Invalid input parameters");
  }
  
  const parts = str.split(".");
  if (parts.length > 2) {
    throw new Error("Invalid amount string: too many decimal points");
  }
  
  const integerStr = parts[0] ?? "0"; 
  const fractionalStr = parts[1];
  
  if (!/^\d+$/.test(integerStr)) {
    throw new Error("Invalid amount string: non-numeric characters in integer part");
  }
  
  const integerPart = BigInt(integerStr) * bigIntPow(BigInt(10), decimals);
  
  if (fractionalStr === undefined || fractionalStr === "") {
    return integerPart;
  }
  
  if (!/^\d+$/.test(fractionalStr)) {
    throw new Error("Invalid amount string: non-numeric characters in fractional part");
  }
  
  if (fractionalStr.length > decimals) {
    throw new Error(`Fractional part has ${fractionalStr.length.toString()} digits, but token only supports ${decimals.toString()} decimals`);
  }
  
  const fractionalPart = BigInt(fractionalStr.padEnd(decimals, "0"));
  return integerPart + fractionalPart;
};


export const amountToString = (amount: bigint, decimals: number): string => {
  if (decimals < 0) {
    throw new Error("Decimals must be non-negative");
  }
  
  const isNegative = amount < BigInt(0)
  const absoluteAmount = isNegative ? -amount : amount;
  const divisor = bigIntPow(BigInt(10), decimals);
  
  const wholePart = absoluteAmount / divisor;
  const fractionalPart = absoluteAmount % divisor;
  const whole = wholePart.toString();
  
  if (fractionalPart === BigInt(0)) {
    return isNegative ? `-${whole}` : whole;
  }
  
  const fractionalStr = fractionalPart.toString().padStart(decimals, "0");
  const fractionalTrimmed = fractionalStr.replace(/0+$/, "");
  const result = `${whole}.${fractionalTrimmed}`;
  
  return isNegative ? `-${result}` : result;
};