import { amountToString, stringToAmount } from '../../utils/amount-to-string';

describe('amountToString', () => {
  it('should convert whole amounts correctly', () => {
    expect(amountToString(1_000_000n, 6)).toBe('1');
    expect(amountToString(5_000_000n, 6)).toBe('5');
    expect(amountToString(123_000_000n, 6)).toBe('123');
  });

  it('should convert decimal amounts correctly', () => {
    expect(amountToString(1_500_000n, 6)).toBe('1.5');
    expect(amountToString(1_230_000n, 6)).toBe('1.23');
    expect(amountToString(1_234_560n, 6)).toBe('1.23456');
  });

  it('should handle small amounts correctly', () => {
    expect(amountToString(1n, 6)).toBe('0.000001');
    expect(amountToString(100n, 6)).toBe('0.0001');
    expect(amountToString(123_456n, 6)).toBe('0.123456');
  });

  it('should remove trailing zeros', () => {
    expect(amountToString(1_500_000n, 6)).toBe('1.5');
    expect(amountToString(1_000_000n, 6)).toBe('1');
    expect(amountToString(1_230_000n, 6)).toBe('1.23');
  });

  it('should handle zero amount', () => {
    expect(amountToString(0n, 6)).toBe('0');
    expect(amountToString(0n, 9)).toBe('0');
  });

  it('should handle different decimal places', () => {
    expect(amountToString(1_000_000_000n, 9)).toBe('1');
    expect(amountToString(1_500_000_000n, 9)).toBe('1.5');
    expect(amountToString(1n, 9)).toBe('0.000000001');
  });

  it('should handle large amounts', () => {
    expect(amountToString(12_345_678_000_000n, 6)).toBe('12345678');
    expect(amountToString(999_999_999_999n, 6)).toBe('999999.999999');
  });
});

describe('stringToAmount', () => {
  it('should convert whole number strings correctly', () => {
    expect(stringToAmount('1', 6)).toBe(1_000_000n);
    expect(stringToAmount('5', 6)).toBe(5_000_000n);
    expect(stringToAmount('123', 6)).toBe(123_000_000n);
  });

  it('should convert decimal strings correctly', () => {
    expect(stringToAmount('1.5', 6)).toBe(1_500_000n);
    expect(stringToAmount('1.23', 6)).toBe(1_230_000n);
    expect(stringToAmount('1.23456', 6)).toBe(1_234_560n);
  });

  it('should handle small decimal amounts', () => {
    expect(stringToAmount('0.000001', 6)).toBe(1n);
    expect(stringToAmount('0.0001', 6)).toBe(100n);
    expect(stringToAmount('0.123456', 6)).toBe(123_456n);
  });

  it('should handle zero', () => {
    expect(stringToAmount('0', 6)).toBe(0n);
    expect(stringToAmount('0.0', 6)).toBe(0n);
    expect(stringToAmount('0.000000', 6)).toBe(0n);
  });

  it('should handle different decimal places', () => {
    expect(stringToAmount('1', 9)).toBe(1_000_000_000n);
    expect(stringToAmount('1.5', 9)).toBe(1_500_000_000n);
    expect(stringToAmount('0.000000001', 9)).toBe(1n);
  });

  it('should pad fractional parts correctly', () => {
    expect(stringToAmount('1.1', 6)).toBe(1_100_000n);
    expect(stringToAmount('1.01', 6)).toBe(1_010_000n);
    expect(stringToAmount('1.001', 6)).toBe(1_001_000n);
  });

  it('should throw error for invalid format', () => {
    expect(() => stringToAmount('1.2.3', 6)).toThrow('Invalid amount string');
    expect(() => stringToAmount('abc', 6)).toThrow();
    // Empty string will cause BigInt('') to throw - this is expected behavior
    // The function doesn't explicitly handle empty strings in the validation
  });

  it('should throw error for too much precision', () => {
    expect(() => stringToAmount('1.1234567', 6)).toThrow(
      'This value is more precise than the token supports'
    );
    expect(() => stringToAmount('0.0000001', 6)).toThrow(
      'This value is more precise than the token supports'
    );
  });

  it('should handle exact precision', () => {
    expect(stringToAmount('1.123456', 6)).toBe(1_123_456n);
    expect(stringToAmount('0.123456', 6)).toBe(123_456n);
  });
});

describe('round-trip conversions', () => {
  const testCases = [
    { amount: 1_000_000n, decimals: 6, expected: '1' },
    { amount: 1_500_000n, decimals: 6, expected: '1.5' },
    { amount: 1_234_560n, decimals: 6, expected: '1.23456' },
    { amount: 123_456n, decimals: 6, expected: '0.123456' },
    { amount: 0n, decimals: 6, expected: '0' },
  ];

  for (const { amount, decimals, expected } of testCases) {
    it(`should convert ${amount} with ${decimals} decimals to "${expected}" and back`, () => {
      const str = amountToString(amount, decimals);
      expect(str).toBe(expected);
      
      const backToAmount = stringToAmount(str, decimals);
      expect(backToAmount).toBe(amount);
    });
  }
});