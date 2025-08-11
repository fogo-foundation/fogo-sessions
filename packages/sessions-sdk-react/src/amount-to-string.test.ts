
/* eslint-disable @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/restrict-template-expressions */
import "@testing-library/jest-dom";
import { amountToString, stringToAmount } from './amount-to-string';



describe('BigInt Amount Utilities', () => {

  describe('stringToAmount', () => {
    it('should convert simple integer strings', () => {
      expect(stringToAmount('100', 2)).toBe(BigInt(10_000));
      expect(stringToAmount('1', 18)).toBe(BigInt("1000000000000000000"));
      expect(stringToAmount('0', 6)).toBe(BigInt(0));
    });
    
    it('should convert decimal strings', () => {
      expect(stringToAmount('1.5', 1)).toBe(BigInt(15));
      expect(stringToAmount('1.50', 2)).toBe(BigInt(150));
      expect(stringToAmount('0.1', 1)).toBe(BigInt(1));
      expect(stringToAmount('0.01', 2)).toBe(BigInt(1));
    });
    
    it('should handle edge cases', () => {
      expect(stringToAmount('0.0', 2)).toBe(BigInt(0));
      expect(stringToAmount('.5', 1)).toBe(BigInt(5));
      expect(stringToAmount('5.', 2)).toBe(BigInt(500));
      expect(stringToAmount('10.0', 2)).toBe(BigInt(1000));
    });
    
    it('should handle high precision', () => {
      expect(stringToAmount('1', 25)).toBe(BigInt("10000000000000000000000000"));
      expect(stringToAmount('0.000000000000000001', 18)).toBe(BigInt(1));
    });
    
    it('should throw on invalid inputs', () => {
      expect(() => stringToAmount('', 2)).toThrow('Invalid input parameters');
      expect(() => stringToAmount('abc', 2)).toThrow('non-numeric characters');
      expect(() => stringToAmount('1.2.3', 2)).toThrow('too many decimal points');
      expect(() => stringToAmount('1.123', 2)).toThrow('Fractional part has 3 digits, but token only supports 2 decimals');
      expect(() => stringToAmount('1.2a', 2)).toThrow('non-numeric characters in fractional part');
      expect(() => stringToAmount('1a.2', 2)).toThrow('non-numeric characters in integer part');
      expect(() => stringToAmount('100', -1)).toThrow('Invalid input parameters');
    });
  });
  

  describe('amountToString', () => {
    it('should convert simple amounts', () => {
      expect(amountToString(BigInt(10_000), 2)).toBe('100');
      expect(amountToString(BigInt(150), 2)).toBe('1.5');
      expect(amountToString(BigInt(1), 2)).toBe('0.01');
      expect(amountToString(BigInt(0), 2)).toBe('0');
    });
    
    it('should handle trailing zeros', () => {
      expect(amountToString(BigInt(1000), 2)).toBe('10');
      expect(amountToString(BigInt(1500), 2)).toBe('15');
      expect(amountToString(BigInt(1010), 2)).toBe('10.1');
    });
    
    it('should handle negative amounts', () => {
      expect(amountToString(BigInt(-10_000), 2)).toBe('-100');
      expect(amountToString(BigInt(-150), 2)).toBe('-1.5');
      expect(amountToString(-BigInt(1), 2)).toBe('-0.01');
    });
    
    it('should handle high precision', () => {
      expect(amountToString(BigInt(1), 18)).toBe('0.000000000000000001');
      expect(amountToString(BigInt("1000000000000000000"), 18)).toBe('1');
      expect(amountToString(BigInt("1500000000000000000"), 18)).toBe('1.5');
    });
    
    it('should handle very large numbers', () => {
      const large = BigInt("123456789012345678901234567890");
      expect(amountToString(large, 6)).toBe('123456789012345678901234.56789');
    });
    
    it('should throw on invalid decimals', () => {
      expect(() => amountToString(BigInt(100), -1)).toThrow('Decimals must be non-negative');
    });
  });
  

  describe('Round-trip consistency', () => {
    const testCases = [
      { str: '0', decimals: 2 },
      { str: '1', decimals: 18 },
      { str: '1.5', decimals: 2 },
      { str: '0.000000000000000001', decimals: 18 },
      { str: '123456.789', decimals: 3 },
      { str: '0.1', decimals: 1 },
    ];
    
    for (const { str, decimals } of testCases) {
      it(`should round-trip correctly: "${str}" with ${decimals} decimals`, () => {
        const amount = stringToAmount(str, decimals);
        const backToString = amountToString(amount, decimals);
        expect(backToString).toBe(str);
      });
    }
  });
  

  describe('Performance edge cases', () => {
    it('should handle maximum safe decimals', () => {
      const maxDecimals = 30;
      expect(() => stringToAmount('1', maxDecimals)).not.toThrow();
      expect(() => amountToString(BigInt(1), maxDecimals)).not.toThrow();
    });
  });
});