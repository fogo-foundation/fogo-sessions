import { useState, useCallback } from 'react';
/**
 * Hook for managing session limits state (apply limits toggle)
 *
 * @param enableUnlimited - Whether unlimited sessions are enabled
 * @param isSessionUnlimited - Whether the current session is unlimited
 * @returns Object with apply limits state and toggle function
 *
 * @category React Hooks
 * @public
 */
export const useSessionLimits = (
  enableUnlimited?: boolean,
  isSessionUnlimited?: boolean
) => {
  const [applyLimits, setApplyLimits] = useState(
    !(isSessionUnlimited ?? enableUnlimited)
  );

  const toggleApplyLimits = useCallback((enabled: boolean) => {
    setApplyLimits(enabled);
  }, []);

  return {
    applyLimits,
    toggleApplyLimits,
    shouldShowLimitToggle: Boolean(enableUnlimited),
  };
};
