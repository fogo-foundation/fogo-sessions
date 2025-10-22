import { getSessionAccount } from '@fogo/sessions-sdk';
import { useState, useEffect } from 'react';

import type { EstablishedSessionState } from '../session-provider';

/**
 * Hook to track session expiration time.
 *
 * @category React Hooks
 * @public
 */
export const useSessionExpiration = (sessionState: EstablishedSessionState) => {
  const [expiration, setExpiration] = useState<Date | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(undefined);

  useEffect(() => {
    const fetchExpiration = async () => {
      try {
        setLoading(true);
        setError(undefined);
        const sessionAccount = await (getSessionAccount as (
          connection: unknown,
          sessionPublicKey: unknown
        ) => Promise<{ expiration: Date } | null | undefined>)(
          sessionState.connection,
          sessionState.sessionPublicKey
        );
        if (sessionAccount) {
          setExpiration(sessionAccount.expiration);
        } else {
          setError(new Error('Session account not found'));
        }
      } catch (error_) {
        setError(error_);
      } finally {
        setLoading(false);
      }
    };

    fetchExpiration().catch((error: unknown) => {
      setError(error)
  });
  }, [sessionState.connection, sessionState.sessionPublicKey]);

  return { expiration, loading, error };
};
