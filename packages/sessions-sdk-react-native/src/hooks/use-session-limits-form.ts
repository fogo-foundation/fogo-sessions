import { useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';
import { useSessionDuration, type DurationKey } from './use-session-duration';
import { useSessionLimits } from './use-session-limits';
import { useTokenFormData } from './use-token-form-data';

export interface UseSessionLimitsFormProps<Token extends PublicKey> {
  enableUnlimited?: boolean;
  isSessionUnlimited?: boolean;
  initialDuration?: DurationKey;
  tokens: Token[];
  onSubmit?: (duration: number, tokens?: Map<Token, bigint>) => void;
}

/**
 * Comprehensive hook for managing session limits form state and logic
 *
 * @param props - Configuration object for the hook
 * @returns Object with all form state and handlers
 *
 * @category React Hooks
 * @public
 */
export const useSessionLimitsForm = <Token extends PublicKey>({
  enableUnlimited,
  isSessionUnlimited,
  initialDuration,
  tokens,
  onSubmit,
}: UseSessionLimitsFormProps<Token>) => {
  const duration = useSessionDuration(initialDuration);
  const limits = useSessionLimits(enableUnlimited, isSessionUnlimited);
  const tokenForm = useTokenFormData();

  const handleSubmit = useCallback(() => {
    if (onSubmit !== undefined) {
      onSubmit(
        duration.durationValue,
        enableUnlimited && !limits.applyLimits
          ? undefined
          : tokenForm.getTokenLimitsMap(tokens)
      );
    }
  }, [
    tokens,
    onSubmit,
    enableUnlimited,
    limits.applyLimits,
    tokenForm,
    duration.durationValue,
  ]);

  return {
    // Duration management
    duration,

    // Limits toggle
    limits,

    // Token form data
    tokenForm,

    // Combined submit handler
    handleSubmit,

    // Derived state
    shouldShowTokenInputs: limits.applyLimits,
    isSubmitDisabled: onSubmit === undefined,
  };
};
