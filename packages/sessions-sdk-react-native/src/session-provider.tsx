import type { Session, SessionAdapter } from '@fogo/sessions-sdk';
import {
  establishSession as establishSessionImpl,
  replaceSession,
  createSolanaWalletAdapter,
  SessionResultType,
  reestablishSession,
  AuthorizedTokens,
} from '@fogo/sessions-sdk';
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
  setLastWalletPublicKey,
  clearLastWalletPublicKey,
  getLastWalletPublicKey,
} from './session-store';

import { Connection, PublicKey } from '@solana/web3.js';
import React, { type ComponentProps, type ReactNode } from 'react';

// Transaction context for better error messages
enum TransactionContext {
  SESSION_ESTABLISHMENT = 'session-establishment',
  SESSION_LIMIT_UPDATE = 'session-limit-update',
  SESSION_REPLACEMENT = 'session-replacement'
}

function createContextualError(error: unknown, context: TransactionContext) {
  const contextMessages = {
    [TransactionContext.SESSION_ESTABLISHMENT]: 'Session creation rejected',
    [TransactionContext.SESSION_LIMIT_UPDATE]: 'Session limit update rejected',
    [TransactionContext.SESSION_REPLACEMENT]: 'Session replacement rejected'
  };

  return {
    message: `${contextMessages[context]}: ${(error as Error)?.message || 'Unknown error'}`,
    context,
    originalError: error,
    name: 'SessionTransactionError'
  };
}
import {
  createContext,
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
  use,
} from 'react';
import { mutate } from 'swr';

import {
  deserializePublicKey,
  deserializePublicKeyList,
  deserializePublicKeyMap,
} from './utils/deserialize-public-key';
import { errorToString } from './utils/error-to-string';
import Toast from 'react-native-toast-message';
import { getCacheKey } from './hooks/use-token-account-data';

import {
  MobileConnectionProvider,
  MobileWalletProvider,
  useMobileConnection,
  useMobileWallet,
} from './wallet-connect/wallet-provider';

/** Time constants for session duration calculations */
const ONE_SECOND_IN_MS = 1000;
const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;
const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS;
const ONE_DAY_IN_MS = 24 * ONE_HOUR_IN_MS;
/** Default session duration: 14 days */
const DEFAULT_SESSION_DURATION = 14 * ONE_DAY_IN_MS;

/**
 * Configuration properties for the FogoSessionProvider component.
 *
 * @public
 */
type Props = ConstrainedOmit<
  ComponentProps<typeof SessionProvider>,
  'sponsor' | 'tokens' | 'defaultRequestedLimits'
> & {
  /** Solana RPC endpoint URL for blockchain connections */
  endpoint: string;

  /** Redirect URL for wallet connect deep linking */
  redirectUrl: string;

  /** Optional list of SPL token public keys to track in sessions */
  tokens?: (PublicKey | string)[] | undefined;

  /** Default spending limits for tokens when establishing sessions */
  defaultRequestedLimits?:
    | Map<PublicKey, bigint>
    | Record<string, bigint>
    | undefined;

  /** Whether to enable unlimited spending permissions */
  enableUnlimited?: boolean | undefined;

  /** Optional sponsor public key for transaction fees */
  sponsor?: PublicKey | string | undefined;

  /** Callback fired when session initialization starts */
  onStartSessionInit?:
    | (() => Promise<boolean> | boolean)
    | (() => Promise<void> | void)
    | undefined;

  /** Domain identifier for the session */
  domain: string;
};

/**
 * Main provider component that sets up Solana session management for your React Native app.
 *
 * This component handles wallet connections, session establishment, and provides context
 * for all session-related functionality. Wrap your app with this provider to enable
 * session-based wallet interactions.
 *
 * @example
 * ```tsx
 * import { FogoSessionProvider, SessionLimitsSheet } from '@fogo/sessions-sdk-react-native';
 *
 * function App() {
 *   return (
 *     <FogoSessionProvider
 *       endpoint="YOUR_SOLANA_RPC_ENDPOINT"
 *       redirectUrl="yourapp://wallet"
 *       domain="yourapp.com"
 *       tokens={['TOKEN_MINT_ADDRESS']}
 *       defaultRequestedLimits={{
 *         'TOKEN_MINT_ADDRESS': 1000000n
 *       }}
 *     >
 *       <YourApp />
 *       <SessionLimitsSheet />
 *     </FogoSessionProvider>
 *   );
 * }
 * ```
 *
 * @param props - Configuration options for the session provider
 * @returns JSX element that wraps your app with session functionality
 *
 * @category Core Providers
 * @public
 */
export const FogoSessionProvider = ({
  endpoint,
  redirectUrl,
  tokens,
  defaultRequestedLimits,
  ...props
}: Props) => {
  const connection = useMemo(() => new Connection(endpoint), [endpoint]);

  return (
    <MobileConnectionProvider connection={connection}>
      <MobileWalletProvider redirectUrl={redirectUrl} domain={props.domain}>
        <SessionProvider
          tokens={tokens ? deserializePublicKeyList(tokens) : undefined}
          defaultRequestedLimits={
            defaultRequestedLimits === undefined
              ? undefined
              : deserializePublicKeyMap(defaultRequestedLimits)
          }
          {...('sponsor' in props && {
            sponsor:
              typeof props.sponsor === 'string'
                ? deserializePublicKey(props.sponsor)
                : props.sponsor,
          })}
          {...props}
        />
      </MobileWalletProvider>
    </MobileConnectionProvider>
  );
};

const SessionProvider = ({
  children,
  defaultRequestedLimits,
  enableUnlimited,
  onStartSessionInit,
  ...args
}: Parameters<typeof useSessionStateContext>[0] & {
  children: ReactNode;
  defaultRequestedLimits?: Map<PublicKey, bigint> | undefined;
  enableUnlimited?: boolean | undefined;
  onStartSessionInit?:
    | (() => Promise<boolean> | boolean)
    | (() => Promise<void> | void)
    | undefined;
}) => {
  const {
    state: sessionState,
    onSessionLimitsOpenChange,
    requestedLimits,
  } = useSessionStateContext(args);

  const state = useMemo(
    () => ({
      sessionState,
      enableUnlimited: enableUnlimited ?? false,
      whitelistedTokens: args.tokens ?? [],
      onStartSessionInit,
      // Session limits functionality
      isSessionLimitsOpen:
        sessionState.type === StateType.RequestingLimits ||
        sessionState.type === StateType.SettingLimits,
      onSessionLimitsOpenChange,
      requestedLimits,
    }),
    [
      sessionState,
      enableUnlimited,
      args.tokens,
      onStartSessionInit,
      onSessionLimitsOpenChange,
      requestedLimits,
    ]
  );

  return <SessionContext value={state}>{children}</SessionContext>;
};

const useSessionStateContext = ({
  tokens,
  ...adapterArgs
}: Parameters<typeof useSessionAdapter>[0] & {
  tokens?: PublicKey[] | undefined;
}) => {
  const [state, setState] = useState<SessionState>(SessionState.Initializing());
  const [showWalletSheet, setShowWalletSheet] = useState<boolean>(false);
  const wallet = useMobileWallet();
  const requestedLimits = useRef<undefined | Map<PublicKey, bigint>>(undefined);
  const getAdapter = useSessionAdapter(adapterArgs);

  const establishSession = useCallback((newLimits?: Map<PublicKey, bigint>) => {
    setState(SessionState.SelectingWallet());
    setShowWalletSheet(true);
    requestedLimits.current = newLimits;
  }, []);

  const disconnectWallet = useCallback(() => {
    wallet.disconnect().catch((error: unknown) => {
      console.error('An error occurred while disconnecting the wallet', error);
    });
  }, [wallet]);

  const endSession = useCallback(
    (walletPublicKey: PublicKey) => {
      clearStoredSession(walletPublicKey).catch((error: unknown) => {
        console.error('Failed to clear stored session', error);
        disconnectWallet();
      });

      // Also clear the last wallet public key
      clearLastWalletPublicKey().catch((error: unknown) => {
        console.error('Failed to clear last wallet public key', error);
      });

      disconnectWallet();
    },
    [disconnectWallet]
  );

  const setSessionState = useCallback(
    async (
      adapter: SessionAdapter,
      session: Session,
      signMessage: (message: Uint8Array) => Promise<Uint8Array>,
      walletName?: string
    ) => {
      try {
        // First, try to store the session securely
        await setStoredSession({
          sessionKey: session.sessionKey,
          walletPublicKey: session.walletPublicKey,
          walletName: walletName || wallet.connectedWalletName || undefined,
        });

        // Store last wallet public key (this can fail without blocking the session)
        setLastWalletPublicKey(session.walletPublicKey).catch(
          (error: unknown) => {
            console.error('Failed to store last wallet public key', error);
          }
        );
      } catch (error: unknown) {
        console.error('Failed to store session', error);

        // Check if it's the biometric enrollment error
        if ((error as Error)?.message?.includes('No biometrics are currently enrolled')) {
          // Show the user-friendly error we added in session-store.ts
          // The error is already handled there, so we just need to prevent session establishment
          setState(SessionState.NotEstablished(() => {}));
          return;
        }

        // For other storage errors, disconnect and show general error
        disconnectWallet();
        setState(SessionState.NotEstablished(() => {}));
        return;
      }
      const commonStateArgs: Parameters<typeof SessionState.UpdatingLimits>[0] =
        {
          endSession: () => {
            endSession(session.walletPublicKey);
          },
          payer: session.payer,
          sendTransaction: async (instructions) => {
            const result = await session.sendTransaction(instructions);
            mutate(getCacheKey(session.walletPublicKey)).catch(
              (error: unknown) => {
                console.error('Failed to update token account data', error);
              }
            );
            return result;
          },
          sessionPublicKey: session.sessionPublicKey,
          isLimited:
            session.sessionInfo.authorizedTokens === AuthorizedTokens.Specific,
          walletPublicKey: session.walletPublicKey,
          connection: adapter.connection as any,
          adapter,
          signMessage,
        };
      const setLimits = (duration: number, limits?: Map<PublicKey, bigint>) => {
        setState(SessionState.UpdatingLimits(commonStateArgs));
        replaceSession({
          expires: new Date(Date.now() + duration),
          adapter,
          signMessage,
          session,
          ...(limits === undefined ? { unlimited: true } : { limits }),
        })
          .then(async (result) => {
            switch (result.type) {
              case SessionResultType.Success: {
                Toast.show({
                  type: 'success',
                  text1: 'Limits set successfully',
                });
                await setSessionState(adapter, result.session, signMessage);
                return;
              }
              case SessionResultType.Failed: {
                const contextualError = createContextualError(result.error, TransactionContext.SESSION_LIMIT_UPDATE);
                Toast.show({
                  type: 'error',
                  text1: contextualError.message,
                });
                setState(
                  SessionState.Established({
                    ...commonStateArgs,
                    setLimits,
                  })
                );
                return;
              }
            }
          })
          .catch((error: unknown) => {
            const contextualError = createContextualError(error, TransactionContext.SESSION_REPLACEMENT);
            Toast.show({
              type: 'error',
              text1: contextualError.message,
            });
            setState(
              SessionState.Established({ ...commonStateArgs, setLimits })
            );
          });
      };
      setState(SessionState.Established({ ...commonStateArgs, setLimits }));
    },
    [disconnectWallet, endSession, wallet.connectedWalletName]
  );

  const restoreSessionState = useCallback(
    (
      adapter: SessionAdapter,
      session: Session,
      signMessage: (message: Uint8Array) => Promise<Uint8Array>
    ) => {
      const commonStateArgs: Parameters<typeof SessionState.UpdatingLimits>[0] =
        {
          endSession: () => {
            endSession(session.walletPublicKey);
          },
          payer: session.payer,
          sendTransaction: async (instructions) => {
            const result = await session.sendTransaction(instructions);
            mutate(getCacheKey(session.walletPublicKey)).catch(
              (error: unknown) => {
                console.error('Failed to update token account data', error);
              }
            );
            return result;
          },
          sessionPublicKey: session.sessionPublicKey,
          isLimited:
            session.sessionInfo.authorizedTokens === AuthorizedTokens.Specific,
          walletPublicKey: session.walletPublicKey,
          connection: adapter.connection as any,
          adapter,
          signMessage,
        };
      const setLimits = (duration: number, limits?: Map<PublicKey, bigint>) => {
        setState(SessionState.UpdatingLimits(commonStateArgs));
        replaceSession({
          expires: new Date(Date.now() + duration),
          adapter,
          signMessage,
          session,
          ...(limits === undefined ? { unlimited: true } : { limits }),
        })
          .then(async (result) => {
            switch (result.type) {
              case SessionResultType.Success: {
                Toast.show({
                  type: 'success',
                  text1: 'Limits set successfully',
                });
                await setSessionState(adapter, result.session, signMessage);
                return;
              }
              case SessionResultType.Failed: {
                const contextualError = createContextualError(result.error, TransactionContext.SESSION_LIMIT_UPDATE);
                Toast.show({
                  type: 'error',
                  text1: contextualError.message,
                });
                setState(
                  SessionState.Established({
                    ...commonStateArgs,
                    setLimits,
                  })
                );
                return;
              }
            }
          })
          .catch((error: unknown) => {
            const contextualError = createContextualError(error, TransactionContext.SESSION_REPLACEMENT);
            Toast.show({
              type: 'error',
              text1: contextualError.message,
            });
            setState(
              SessionState.Established({ ...commonStateArgs, setLimits })
            );
          });
      };
      setState(SessionState.Established({ ...commonStateArgs, setLimits }));
    },
    [endSession, setSessionState]
  );

  const checkStoredSession = useCallback(
    async (
      walletPublicKey: PublicKey,
      signMessage: (message: Uint8Array) => Promise<Uint8Array>
    ) => {
      const adapter = (await getAdapter()) as SessionAdapter;
      const storedSession = await getStoredSession(walletPublicKey);
      if (storedSession === undefined) {
        if (tokens === undefined || tokens.length === 0) {
          setState(SessionState.SettingLimits());
          try {
            const result = await establishSessionImpl({
              expires: new Date(Date.now() + DEFAULT_SESSION_DURATION),
              adapter,
              signMessage,
              walletPublicKey,
              unlimited: true,
              createUnsafeExtractableSessionKey: true,
            });
            switch (result.type) {
              case SessionResultType.Success: {
                await setSessionState(adapter, result.session, signMessage);
                return;
              }
              case SessionResultType.Failed: {
                console.error('Connection failed', result.error);
                endSession(walletPublicKey);
                return;
              }
            }
          } catch (error: unknown) {
            console.error('Failed to establish session', error);
            endSession(walletPublicKey);
          }
        } else {
          const setLimits = (
            duration: number,
            limits?: Map<PublicKey, bigint>
          ) => {
            setState(SessionState.SettingLimits());
            establishSessionImpl({
              expires: new Date(Date.now() + duration),
              adapter,
              signMessage,
              walletPublicKey,
              createUnsafeExtractableSessionKey: true,
              ...(limits === undefined ? { unlimited: true } : { limits }),
            })
              .then(async (result) => {
                switch (result.type) {
                  case SessionResultType.Success: {
                    await setSessionState(adapter, result.session, signMessage);
                    return;
                  }
                  case SessionResultType.Failed: {
                    const contextualError = createContextualError(result.error, TransactionContext.SESSION_ESTABLISHMENT);
                    setState(
                      SessionState.RequestingLimits(setLimits, contextualError)
                    );
                    return;
                  }
                }
              })
              .catch((error: unknown) => {
                console.error('Failed to establish session', error);
                const contextualError = createContextualError(error, TransactionContext.SESSION_ESTABLISHMENT);
                setState(SessionState.RequestingLimits(setLimits, contextualError));
              });
          };
          setState(SessionState.RequestingLimits(setLimits));
        }
      } else {
        const session = await reestablishSession(
          adapter,
          storedSession.walletPublicKey,
          storedSession.sessionKey
        );
        if (session === undefined) {
          endSession(walletPublicKey);
        } else {
          restoreSessionState(adapter, session, signMessage);
        }
      }
    },
    [getAdapter, restoreSessionState, endSession, tokens, setSessionState]
  );

  const onSessionLimitsOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && state.type === StateType.RequestingLimits) {
        disconnectWallet();
      }
    },
    [state, disconnectWallet]
  );

  useEffect(() => {
    if (!showWalletSheet && state.type === StateType.SelectingWallet) {
      setState(SessionState.NotEstablished(establishSession));
    }
  }, [showWalletSheet, establishSession, state.type]);

  useEffect(() => {
    switch (state.type) {
      case StateType.CheckingStoredSession: {
        checkStoredSession(
          new PublicKey(state.walletPublicKey),
          state.signMessage
        ).catch((error: unknown) => {
          console.error('Failed to check stored session', error);
          disconnectWallet();
        });
        return;
      }
    }
  }, [state, checkStoredSession, disconnectWallet]);

  useEffect(() => {
    setState(
      (prevState) =>
        getNextState(prevState, wallet, establishSession) ?? prevState
    );
  }, [wallet, establishSession]);

  // Check for stored sessions on initialization
  useEffect(() => {
    const initializeSession = async () => {
      if (state.type === StateType.Initializing) {
        try {
          // Get the last wallet public key (no authentication required)
          const lastWalletPublicKey = await getLastWalletPublicKey();
          if (lastWalletPublicKey) {
            // Placeholder signMessage function - the real work happens in checkStoredSession
            const placeholderSignMessage = async (
              _: Uint8Array
            ): Promise<Uint8Array> => {
              throw new Error(
                'Placeholder signMessage during session restoration'
              );
            };

            // Use existing checkStoredSession function - this will trigger CheckingStoredSession state
            await checkStoredSession(
              lastWalletPublicKey,
              placeholderSignMessage
            );
          } else {
            // No stored wallet public key, go to not established state
            setState(SessionState.NotEstablished(establishSession));
          }
        } catch (error) {
          console.error('Failed to initialize session:', error);
          setState(SessionState.NotEstablished(establishSession));
        }
      }
    };

    initializeSession();
  }, [state.type, checkStoredSession, establishSession]);

  return useMemo(
    () => ({
      state,
      onSessionLimitsOpenChange,
      requestedLimits: requestedLimits.current,
    }),
    [state, onSessionLimitsOpenChange, requestedLimits.current]
  );
};

const useSessionAdapter = (
  options: ConstrainedOmit<
    Parameters<typeof createSolanaWalletAdapter>[0],
    'connection'
  >
) => {
  const { connection } = useMobileConnection();
  const adapter = useRef<undefined | SessionAdapter>(undefined);
  return useCallback(async () => {
    if (adapter.current === undefined) {
      try {
        adapter.current = await createSolanaWalletAdapter({
          ...options,
          connection: connection as any,
        });
      } catch {
        console.error('failed to create adapter');
      }

      return adapter.current;
    } else {
      return adapter.current;
    }
  }, [connection, options]);
};

const getNextState = (
  state: SessionState,
  wallet: ReturnType<typeof useMobileWallet>,
  establishSession: (requestedLimits?: Map<PublicKey, bigint>) => void
) => {
  if (wallet.connecting) {
    switch (state.type) {
      case StateType.Initializing:
      case StateType.NotEstablished:
      case StateType.SelectingWallet: {
        return SessionState.WalletConnecting();
      }
      case StateType.WalletConnecting: {
        return;
      }
      case StateType.CheckingStoredSession:
      case StateType.Established:
      case StateType.RequestingLimits:
      case StateType.SettingLimits:
      case StateType.UpdatingLimits: {
        // This should be impossible
        throw new InvariantFailedError(
          `Invalid state change which should not be possible: wallet changed to connecting while state was ${showSessionState(state)}.`
        );
      }
    }
  } else if (wallet.connected && !wallet.disconnecting) {
    if (wallet.publicKey === null || wallet.signMessage === undefined) {
      throw new InvariantFailedError(
        'Invalid wallet state returned from solana: connected but no public key or message signer.'
      );
    } else {
      switch (state.type) {
        case StateType.Initializing:
        case StateType.NotEstablished:
        case StateType.WalletConnecting:
        case StateType.SelectingWallet:
        case StateType.RequestingLimits:
        case StateType.UpdatingLimits: {
          return SessionState.CheckingStoredSession(
            wallet.publicKey,
            wallet.signMessage
          );
        }
        case StateType.Established: {
          return state.walletPublicKey.equals(wallet.publicKey)
            ? undefined
            : SessionState.CheckingStoredSession(
                wallet.publicKey,
                wallet.signMessage
              );
        }
        case StateType.SettingLimits:
        case StateType.CheckingStoredSession: {
          return;
        }
      }
    }
  } else {
    switch (state.type) {
      case StateType.CheckingStoredSession:
      case StateType.Established:
      case StateType.RequestingLimits:
      case StateType.SettingLimits:
      case StateType.UpdatingLimits:
      case StateType.WalletConnecting:
      case StateType.SelectingWallet: {
        return SessionState.NotEstablished(establishSession);
      }
      case StateType.Initializing: {
        return; // Let the initialization effect handle the state transition
      }
      case StateType.NotEstablished: {
        return;
      }
    }
  }
};

const SessionContext = createContext<
  | {
      sessionState: SessionState;
      enableUnlimited: boolean;
      whitelistedTokens: PublicKey[];
      onStartSessionInit?:
        | (() => Promise<boolean> | boolean)
        | (() => Promise<void> | void)
        | undefined;
      // Session limits functionality
      isSessionLimitsOpen: boolean;
      onSessionLimitsOpenChange: (isOpen: boolean) => void;
      requestedLimits: Map<PublicKey, bigint> | undefined;
    }
  | undefined
>(undefined);

export const useSessionContext = () => {
  const value = use(SessionContext);
  if (value === undefined) {
    throw new NotInitializedError();
  } else {
    return value;
  }
};

/**
 * Hook to access the current session state.
 *
 * @returns Current session state object
 *
 * @example
 * ```tsx
 * import { useSession, StateType } from '@fogo/sessions-sdk-react-native';
 *
 * function MyComponent() {
 *   const sessionState = useSession();
 *
 *   if (sessionState.type === StateType.Established) {
 *     // User has an active session
 *     return <div>Session active for {sessionState.walletPublicKey.toBase58()}</div>;
 *   }
 *
 *   return <div>No active session</div>;
 * }
 * ```
 *
 * @category React Hooks
 * @public
 */
export const useSession = () => useSessionContext().sessionState;

/**
 * Enumeration of all possible session states.
 *
 * These states represent the different phases of session management,
 * from initialization through establishment and ongoing operation.
 *
 * @category Types & Enums
 * @public
 */
export enum StateType {
  /** Initial state when the provider is setting up */
  Initializing,

  /** No session is established, user can start a new session */
  NotEstablished,

  /** User is selecting which wallet to connect with */
  SelectingWallet,

  /** Currently connecting to the selected wallet */
  WalletConnecting,

  /** Checking if there's a stored session for the connected wallet */
  CheckingStoredSession,

  /** Requesting spending limits from the user */
  RequestingLimits,

  /** In the process of setting the requested limits */
  SettingLimits,

  /** Session is successfully established and active */
  Established,

  /** User is updating existing session limits */
  UpdatingLimits,
}

const SessionState: Record<string, (...args: any[]) => any> = {
  Initializing: (): { type: StateType.Initializing } => ({ type: StateType.Initializing as const }),

  NotEstablished: (
    establishSession: (requestedLimits?: Map<PublicKey, bigint>) => void
  ) => ({
    type: StateType.NotEstablished as const,
    establishSession,
  }),

  SelectingWallet: () => ({ type: StateType.SelectingWallet as const }),

  WalletConnecting: () => ({ type: StateType.WalletConnecting as const }),

  CheckingStoredSession: (
    walletPublicKey: PublicKey,
    signMessage: (message: Uint8Array) => Promise<Uint8Array>
  ) => ({
    type: StateType.CheckingStoredSession as const,
    walletPublicKey,
    signMessage,
  }),

  RequestingLimits: (
    onSubmitLimits: (duration: number, limits?: Map<PublicKey, bigint>) => void,
    error?: unknown
  ) => ({
    type: StateType.RequestingLimits as const,
    onSubmitLimits,
    error,
  }),

  SettingLimits: () => ({ type: StateType.SettingLimits as const }),

  Established: (
    options: Pick<
      Session,
      'walletPublicKey' | 'sessionPublicKey' | 'sendTransaction' | 'payer'
    > & {
      adapter: SessionAdapter;
      signMessage: (message: Uint8Array) => Promise<Uint8Array>;
      connection: ReturnType<typeof useMobileConnection>['connection'];
      isLimited: boolean;
      setLimits: (duration: number, limits?: Map<PublicKey, bigint>) => void;
      endSession: () => void;
    },
    updateLimitsError?: unknown
  ) => ({
    type: StateType.Established as const,
    ...options,
    updateLimitsError,
  }),

  UpdatingLimits: (
    options: Pick<
      Session,
      'walletPublicKey' | 'sessionPublicKey' | 'sendTransaction' | 'payer'
    > & {
      adapter: SessionAdapter;
      signMessage: (message: Uint8Array) => Promise<Uint8Array>;
      connection: ReturnType<typeof useMobileConnection>['connection'];
      isLimited: boolean;
      endSession: () => void;
    }
  ) => ({ type: StateType.UpdatingLimits as const, ...options }),
};

/**
 * Type mapping of all possible session state objects.
 *
 * Each state contains different properties depending on the current phase
 * of session management.
 *
 * @category Types & Enums
 * @public
 */
export type SessionStates = {
  [key in keyof typeof SessionState]: ReturnType<(typeof SessionState)[key]>;
};

/**
 * Union type representing any possible session state.
 *
 * Use this type when you need to handle any session state generically.
 *
 * @category Types & Enums
 * @public
 */
export type SessionState = SessionStates[keyof SessionStates];

/**
 * Union type representing active session states.
 *
 * These states indicate that a session is established and can be used
 * for sending transactions.
 *
 * @category Types & Enums
 * @public
 */
export type EstablishedSessionState =
  | SessionStates['Established']
  | SessionStates['UpdatingLimits'];

const SESSION_STATE_NAME = {
  [StateType.Initializing]: 'Initializing',
  [StateType.NotEstablished]: 'NotEstablished',
  [StateType.SelectingWallet]: 'SelectingWallet',
  [StateType.WalletConnecting]: 'WalletConnecting',
  [StateType.CheckingStoredSession]: 'CheckingStoredSession',
  [StateType.RequestingLimits]: 'RequestingLimits',
  [StateType.SettingLimits]: 'SettingLimits',
  [StateType.Established]: 'Established',
  [StateType.UpdatingLimits]: 'UpdatingLimits',
};

const showSessionState = (state: SessionState) =>
  SESSION_STATE_NAME[state.type];

export const isEstablished = (
  sessionState: SessionState
): sessionState is EstablishedSessionState =>
  sessionState.type === StateType.Established ||
  sessionState.type === StateType.UpdatingLimits;

class NotInitializedError extends Error {
  constructor() {
    super('This component must be contained within a <FogoSessionProvider>');
    this.name = 'NotInitializedError';
  }
}

class InvariantFailedError extends Error {
  constructor(message: string) {
    super(`An expected invariant failed: ${message}`);
    this.name = 'InvariantFailedError';
  }
}

type ConstrainedOmit<T, K> = {
  [P in keyof T as Exclude<P, K & keyof any>]: T[P];
};
