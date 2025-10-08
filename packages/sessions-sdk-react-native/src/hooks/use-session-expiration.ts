import { useState, useEffect } from 'react';
import { getSessionAccount } from '@fogo/sessions-sdk';
import type { EstablishedSessionState } from '../session-provider';

/**
 * Hook to track session expiration time.
 *
 * @category React Hooks
 * @public
 */
export const useSessionExpiration = (sessionState: EstablishedSessionState) => {
  const [expiration, setExpiration] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    const fetchExpiration = async () => {
      try {
        setLoading(true);
        setError(null);
        const sessionAccount = await getSessionAccount(
          sessionState.connection,
          sessionState.sessionPublicKey
        );
        if (sessionAccount) {
          setExpiration(sessionAccount.expiration);
        } else {
          setError(new Error('Session account not found'));
        }
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchExpiration();
  }, [sessionState.connection, sessionState.sessionPublicKey]);

  return { expiration, loading, error };
};
