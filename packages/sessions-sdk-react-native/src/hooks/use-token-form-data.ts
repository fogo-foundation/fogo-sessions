import { useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { stringToAmount } from '../utils/amount-to-string';

/**
 * Hook for managing token form data (token amounts and decimals)
 *
 * @returns Object with form data state and update function
 *
 * @category React Hooks
 * @public
 */
export const useTokenFormData = () => {
  const [formData, setFormData] = useState<
    Map<string, { value: string; decimals: number }>
  >(new Map());

  const updateFormData = useCallback(
    (mint: string, value: string, decimals: number) => {
      setFormData((prev) => new Map(prev.set(mint, { value, decimals })));
    },
    []
  );

  const getTokenLimitsMap = useCallback(
    <Token extends PublicKey>(tokens: Token[]): Map<Token, bigint> => {
      return new Map(
        tokens
          .map((mint) => {
            const data = formData.get(mint.toBase58());
            return data
              ? ([mint, stringToAmount(data.value, data.decimals)] as const)
              : undefined;
          })
          .filter((value) => value !== undefined)
      );
    },
    [formData]
  );

  const clearFormData = useCallback(() => {
    setFormData(new Map());
  }, []);

  return {
    formData,
    updateFormData,
    getTokenLimitsMap,
    clearFormData,
  };
};
