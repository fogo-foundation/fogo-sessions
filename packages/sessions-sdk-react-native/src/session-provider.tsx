import type { Session, SessionAdapter } from '@fogo/sessions-sdk';
import {
  establishSession as establishSessionImpl,
  replaceSession,
  createSolanaWalletAdapter,
  SessionResultType,
  reestablishSession,
  AuthorizedTokens,
} from '@fogo/sessions-sdk';
import { Connection, PublicKey } from '@solana/web3.js';
import type { ComponentProps, ReactNode } from 'react';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import React, {
  createContext,
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
  use,
} from 'react';
import Toast from 'react-native-toast-message';
import { mutate } from 'swr';

// Type definitions to work around SDK typing issues
type SafeSession = {
  sessionKey: unknown;
  walletPublicKey: PublicKey;
  payer: unknown;
  sendTransaction: (instructions: unknown) => Promise<unknown>;
  sessionPublicKey: PublicKey;
  sessionInfo: {
    authorizedTokens: unknown;
  };
};

type SafeSessionAdapter = {
  connection: Connection;
};

type SafeSessionResult = {
  type: unknown;
  session?: SafeSession;
  error?: unknown;
};

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
    message: `${contextMessages[context]}: ${(error as Error).message || 'Unknown error'}`,
    context,
    originalError: error,
    name: 'SessionTransactionError'
  };
}

import { getCacheKey } from './hooks/use-token-account-data';
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
  setLastWalletPublicKey,
  clearLastWalletPublicKey,
  getLastWalletPublicKey,
} from './session-store';
import {
  deserializePublicKey,
  deserializePublicKeyList,
  deserializePublicKeyMap,
} from './utils/deserialize-public-key';
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
              typeof (props as {sponsor?: string | PublicKey}).sponsor === 'string'
                ? deserializePublicKey((props as {sponsor: string}).sponsor)
                : (props as {sponsor: PublicKey}).sponsor,
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
}: Omit<Parameters<typeof useSessionStateContext>[0], 'children'> & {
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
  } = useSessionStateContext({ defaultRequestedLimits, ...args });

  const tokensFromArgs = (args as {tokens?: PublicKey[]}).tokens;

  const state = useMemo(
    () => ({
      sessionState,
      enableUnlimited: enableUnlimited ?? false,
      whitelistedTokens: tokensFromArgs ?? [],
      onStartSessionInit: onStartSessionInit as (() => Promise<boolean> | boolean) | (() => Promise<void> | void) | undefined,
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
      tokensFromArgs,
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
}: Omit<Parameters<typeof useSessionAdapter>[0], 'tokens'> & {
  tokens?: PublicKey[] | undefined;
}) => {
  const [state, setState] = useState<SessionState>(SessionState.Initializing() as SessionState);
  const [showWalletSheet, setShowWalletSheet] = useState<boolean>(false);
  const wallet = useMobileWallet();
  const requestedLimits = useRef<undefined | Map<PublicKey, bigint>>(undefined);
  const getAdapter = useSessionAdapter(adapterArgs);

  const establishSession = useCallback((newLimits?: Map<PublicKey, bigint>) => {
    setState(() => SessionState.SelectingWallet() as SessionState);
    setShowWalletSheet(true);
    requestedLimits.current = newLimits;
  }, []);

  const disconnectWallet = useCallback(() => {
    void wallet.disconnect();
  }, [wallet]);

  const endSession = useCallback(
    (walletPublicKey: PublicKey) => {
      clearStoredSession(walletPublicKey).catch(() => {
        disconnectWallet();
      });

      // Also clear the last wallet public key
      void clearLastWalletPublicKey();

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
          sessionKey: (session as SafeSession).sessionKey,
          walletPublicKey: (session as SafeSession).walletPublicKey,
          ...(walletName ?? wallet.connectedWalletName) && {
            walletName: walletName ?? wallet.connectedWalletName
          },
        });

        // Store last wallet public key (this can fail without blocking the session)
        setLastWalletPublicKey((session as SafeSession).walletPublicKey).catch(() => {
          // Ignore errors when setting last wallet public key
        });
      } catch (error: unknown) {

        // Check if it's the biometric enrollment error
        if ((error as Error).message.includes('No biometrics are currently enrolled')) {
          // Show the user-friendly error we added in session-store.ts
          // The error is already handled there, so we just need to prevent session establishment
          setState(SessionState.NotEstablished(() => {
            // Intentionally empty - no additional state needed
          }) as SessionState);
          return;
        }

        // For other storage errors, disconnect and show general error
        disconnectWallet();
        setState(SessionState.NotEstablished(() => {
          // Intentionally empty - no additional state needed
        }) as SessionState);
        return;
      }
      const commonStateArgs: Parameters<NonNullable<typeof SessionState.UpdatingLimits>>[0] =
      {
        endSession: () => {
          endSession((session as SafeSession).walletPublicKey);
        },
        payer: (session as SafeSession).payer,
        sendTransaction: async (instructions: unknown) => {
          const result = await (session as SafeSession).sendTransaction(instructions);
          mutate(getCacheKey((session as SafeSession).walletPublicKey)).catch(() => {
            // Ignore cache refresh errors
          });
          return result;
        },
        sessionPublicKey: (session as SafeSession).sessionPublicKey,
        isLimited:
          (session as SafeSession).sessionInfo.authorizedTokens === (AuthorizedTokens as {Specific: unknown}).Specific,
        walletPublicKey: (session as SafeSession).walletPublicKey,
        connection: (adapter as SafeSessionAdapter).connection,
        adapter: adapter as SafeSessionAdapter,
        signMessage,
      };
      const setLimits = (duration: number, limits?: Map<PublicKey, bigint>) => {
        setState(SessionState.UpdatingLimits(commonStateArgs) as SessionState);
        (replaceSession as (args: unknown) => Promise<SafeSessionResult>)({
          expires: new Date(Date.now() + duration),
          adapter: adapter as SafeSessionAdapter,
          signMessage,
          session: session as SafeSession,
          ...(limits === undefined ? { unlimited: true } : { limits }),
        })
          .then(async (result) => {
            switch ((result).type) {
              case (SessionResultType as {Success: unknown}).Success: {
                Toast.show({
                  type: 'success',
                  text1: 'Limits set successfully',
                });
                const sessionData = (result).session;
                if (sessionData) {
                  await setSessionState(adapter, sessionData, signMessage);
                }
                return;
              }
              case (SessionResultType as {Failed: unknown}).Failed: {
                const contextualError = createContextualError((result).error, TransactionContext.SESSION_LIMIT_UPDATE);
                Toast.show({
                  type: 'error',
                  text1: contextualError.message,
                });
                setState(
                  SessionState.Established({
                    ...commonStateArgs,
                    setLimits,
                  }) as SessionState
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
              SessionState.Established({ ...commonStateArgs, setLimits }) as SessionState
            );
          });
      };
      setState(SessionState.Established({ ...commonStateArgs, setLimits }) as SessionState);
    },
    [disconnectWallet, endSession, wallet.connectedWalletName]
  );

  const restoreSessionState = useCallback(
    (
      adapter: SessionAdapter,
      session: Session,
      signMessage: (message: Uint8Array) => Promise<Uint8Array>
    ) => {
      const commonStateArgs: Parameters<NonNullable<typeof SessionState.UpdatingLimits>>[0] =
      {
        endSession: () => {
          endSession((session as SafeSession).walletPublicKey);
        },
        payer: (session as SafeSession).payer,
        sendTransaction: async (instructions: unknown) => {
          const result = await (session as SafeSession).sendTransaction(instructions);
          mutate(getCacheKey((session as SafeSession).walletPublicKey)).catch(
            () => {
              // Ignore cache mutation errors
            }
          );
          return result;
        },
        sessionPublicKey: (session as SafeSession).sessionPublicKey,
        isLimited:
          (session as SafeSession).sessionInfo.authorizedTokens === (AuthorizedTokens as {Specific: unknown}).Specific,
        walletPublicKey: (session as SafeSession).walletPublicKey,
        connection: (adapter as SafeSessionAdapter).connection,
        adapter: adapter as SafeSessionAdapter,
        signMessage,
      };
      const setLimits = (duration: number, limits?: Map<PublicKey, bigint>) => {
        setState(SessionState.UpdatingLimits(commonStateArgs) as SessionState);
        (replaceSession as (args: unknown) => Promise<SafeSessionResult>)({
          expires: new Date(Date.now() + duration),
          adapter: adapter as SafeSessionAdapter,
          signMessage,
          session: session as SafeSession,
          ...(limits === undefined ? { unlimited: true } : { limits }),
        })
          .then(async (result) => {
            switch ((result).type) {
              case (SessionResultType as {Success: unknown}).Success: {
                Toast.show({
                  type: 'success',
                  text1: 'Limits set successfully',
                });
                const sessionData = (result).session;
                if (sessionData) {
                  await setSessionState(adapter, sessionData, signMessage);
                }
                return;
              }
              case (SessionResultType as {Failed: unknown}).Failed: {
                const contextualError = createContextualError((result).error, TransactionContext.SESSION_LIMIT_UPDATE);
                Toast.show({
                  type: 'error',
                  text1: contextualError.message,
                });
                setState(
                  SessionState.Established({
                    ...commonStateArgs,
                    setLimits,
                  }) as SessionState
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
              SessionState.Established({ ...commonStateArgs, setLimits }) as SessionState
            );
          });
      };
      setState(SessionState.Established({ ...commonStateArgs, setLimits }) as SessionState);
    },
    [endSession, setSessionState]
  );

  const checkStoredSession = useCallback(
    async (
      walletPublicKey: PublicKey,
      signMessage: (message: Uint8Array) => Promise<Uint8Array>
    ) => {
      const adapterResult = await getAdapter();
      if (!adapterResult) {
        throw new Error('Failed to get adapter');
      }
      const adapter = adapterResult;
      const storedSession = await getStoredSession(walletPublicKey);
      if (storedSession === undefined) {
        if (tokens === undefined || tokens.length === 0) {
          setState(SessionState.SettingLimits() as SessionState);
          try {
            const result = await (establishSessionImpl as (args: unknown) => Promise<SafeSessionResult>)({
              expires: new Date(Date.now() + DEFAULT_SESSION_DURATION),
              adapter: adapter,
              signMessage,
              walletPublicKey,
              unlimited: true,
              createUnsafeExtractableSessionKey: true,
            });
            switch (result.type) {
              case (SessionResultType as {Success: unknown}).Success: {
                const sessionData = result.session;
                if (sessionData) {
                  await setSessionState(adapter, sessionData, signMessage);
                }
                return;
              }
              case (SessionResultType as {Failed: unknown}).Failed: {
                endSession(walletPublicKey);
                return;
              }
            }
          } catch {
            endSession(walletPublicKey);
          }
        } else {
          const setLimits = (
            duration: number,
            limits?: Map<PublicKey, bigint>
          ) => {
            setState(SessionState.SettingLimits() as SessionState);
            (establishSessionImpl as (args: unknown) => Promise<SafeSessionResult>)({
              expires: new Date(Date.now() + duration),
              adapter,
              signMessage,
              walletPublicKey,
              createUnsafeExtractableSessionKey: true,
              ...(limits === undefined ? { unlimited: true } : { limits }),
            })
              .then(async (result) => {
                switch (result.type) {
                  case (SessionResultType as {Success: unknown}).Success: {
                    const sessionData = result.session;
                if (sessionData) {
                  await setSessionState(adapter, sessionData, signMessage);
                }
                    return;
                  }
                  case (SessionResultType as {Failed: unknown}).Failed: {
                    const contextualError = createContextualError((result as SafeSessionResult & {error: unknown}).error, TransactionContext.SESSION_ESTABLISHMENT);
                    setState(
                      SessionState.RequestingLimits(setLimits, contextualError) as SessionState
                    );
                    return;
                  }
                }
              })
              .catch((error: unknown) => {
                const contextualError = createContextualError(error, TransactionContext.SESSION_ESTABLISHMENT);
                setState(SessionState.RequestingLimits(setLimits, contextualError) as SessionState);
              });
          };
          setState(SessionState.RequestingLimits(setLimits) as SessionState);
        }
      } else {
        const session = await (reestablishSession as (adapter: unknown, walletPublicKey: unknown, sessionKey: unknown) => Promise<SafeSession | undefined>)(
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
      setState(SessionState.NotEstablished(establishSession) as SessionState);
    }
  }, [showWalletSheet, establishSession, state.type]);

  useEffect(() => {
    switch (state.type) {
      case StateType.CheckingStoredSession: {
        checkStoredSession(
          new PublicKey(state.walletPublicKey),
          state.signMessage
        ).catch(() => {
          disconnectWallet();
        });
        return;
      }
    }
  }, [state, checkStoredSession, disconnectWallet]);

  useEffect(() => {
    setState(
      (prevState: SessionState) =>
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
            const placeholderSignMessage = (
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
            setState(SessionState.NotEstablished(establishSession) as SessionState);
          }
        } catch {
          setState(SessionState.NotEstablished(establishSession) as SessionState);
        }
      }
    };

    void initializeSession();
  }, [state.type, checkStoredSession, establishSession]);

  return useMemo(
    () => ({
      state,
      onSessionLimitsOpenChange,
      requestedLimits: requestedLimits.current,
    }),
    [state, onSessionLimitsOpenChange]
  );
};

const useSessionAdapter = (
  options: ConstrainedOmit<
    Parameters<typeof createSolanaWalletAdapter>[0],
    'connection'
  >
) => {
  const { connection } = useMobileConnection();
  const adapter = useRef<undefined | SafeSessionAdapter>(undefined);
  return useCallback(async () => {
    if (adapter.current === undefined) {
      try {
        adapter.current = await (createSolanaWalletAdapter as (options: unknown) => Promise<SafeSessionAdapter>)({
          ...options,
          connection: connection as unknown,
        });
      } catch {
        // Ignore errors during adapter creation
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
        return SessionState.WalletConnecting() as SessionState;
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
    if (wallet.publicKey === undefined || wallet.signMessage === undefined) {
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
          ) as SessionState;
        }
        case StateType.Established: {
          return state.walletPublicKey.equals(wallet.publicKey)
            ? undefined
            : SessionState.CheckingStoredSession(
              wallet.publicKey,
              wallet.signMessage
            ) as SessionState;
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
        return SessionState.NotEstablished(establishSession) as SessionState;
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

const SessionState = {
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
  ): {
    type: StateType.Established;
    walletPublicKey: PublicKey;
    sessionPublicKey: PublicKey;
    sendTransaction: Session['sendTransaction'];
    payer: Session['payer'];
    adapter: SessionAdapter;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    connection: ReturnType<typeof useMobileConnection>['connection'];
    isLimited: boolean;
    setLimits: (duration: number, limits?: Map<PublicKey, bigint>) => void;
    endSession: () => void;
    updateLimitsError?: unknown;
  } => ({
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
  ): {
    type: StateType.UpdatingLimits;
    walletPublicKey: PublicKey;
    sessionPublicKey: PublicKey;
    sendTransaction: Session['sendTransaction'];
    payer: Session['payer'];
    adapter: SessionAdapter;
    signMessage: (message: Uint8Array) => Promise<Uint8Array>;
    connection: ReturnType<typeof useMobileConnection>['connection'];
    isLimited: boolean;
    endSession: () => void;
  } => ({ type: StateType.UpdatingLimits as const, ...options }),
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

type ConstrainedOmit<T, K extends keyof T> = {
  [P in keyof T as Exclude<P, K>]: T[P];
};
