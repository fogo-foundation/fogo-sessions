"use client";

import type { Session, SessionAdapter } from "@fogo/sessions-sdk";
import {
  establishSession as establishSessionImpl,
  replaceSession,
  createSolanaWalletAdapter,
  SessionResultType,
  reestablishSession,
  AuthorizedTokens,
  TransactionResultType,
  revokeSession,
  createLogInToken,
} from "@fogo/sessions-sdk";
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
} from "@fogo/sessions-sdk-web";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import {
  ConnectionProvider,
  WalletProvider,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  WalletModalProvider,
  useWalletModal,
} from "@solana/wallet-adapter-react-ui";
import {
  SolflareWalletAdapter,
  PhantomWalletAdapter,
  NightlyWalletAdapter,
  BitgetWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { PublicKey } from "@solana/web3.js";
import type { ComponentProps, ReactNode } from "react";
import {
  createContext,
  useMemo,
  useCallback,
  useState,
  useEffect,
  useRef,
  use,
} from "react";
import { mutate } from "swr";
import { z } from "zod";

import {
  deserializePublicKey,
  deserializePublicKeyList,
  deserializePublicKeyMap,
} from "./deserialize-public-key.js";
import { errorToString } from "./error-to-string.js";
import { ModalDialog } from "./modal-dialog.js";
import { SessionLimits } from "./session-limits.js";
import { ToastProvider, useToast } from "./toast.js";
import {
  getCacheKey,
  useTokenAccountData,
  StateType as TokenDataStateType,
} from "./use-token-account-data.js";

import "@solana/wallet-adapter-react-ui/styles.css";

const ONE_SECOND_IN_MS = 1000;
const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;
const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS;
const ONE_DAY_IN_MS = 24 * ONE_HOUR_IN_MS;
const DEFAULT_SESSION_DURATION = 14 * ONE_DAY_IN_MS;

const ERROR_CODE_SESSION_EXPIRED = 4_000_000_000;
const ERROR_CODE_SESSION_LIMITS_EXCEEDED = 4_000_000_008;

type Props = ConstrainedOmit<
  ComponentProps<typeof SessionProvider>,
  "sponsor" | "tokens" | "defaultRequestedLimits"
> & {
  endpoint: string;
  tokens?: (PublicKey | string)[] | undefined;
  defaultRequestedLimits?:
    | Map<PublicKey, bigint>
    | Record<string, bigint>
    | undefined;
  enableUnlimited?: boolean | undefined;
  sponsor?: PublicKey | string | undefined;
  onStartSessionInit?:
    | (() => Promise<boolean> | boolean)
    | (() => Promise<void> | void)
    | undefined;
  wallets?: ComponentProps<typeof WalletProvider>["wallets"];
};

export const FogoSessionProvider = ({
  endpoint,
  tokens,
  defaultRequestedLimits,
  wallets = [
    new NightlyWalletAdapter(),
    new PhantomWalletAdapter(),
    new BitgetWalletAdapter(),
    new BackpackWalletAdapter(),
    new SolflareWalletAdapter(),
  ],
  ...props
}: Props) => (
  <ToastProvider>
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <SessionProvider
            tokens={tokens ? deserializePublicKeyList(tokens) : undefined}
            defaultRequestedLimits={
              defaultRequestedLimits === undefined
                ? undefined
                : deserializePublicKeyMap(defaultRequestedLimits)
            }
            {...("sponsor" in props && {
              sponsor:
                typeof props.sponsor === "string"
                  ? deserializePublicKey(props.sponsor)
                  : props.sponsor,
            })}
            {...props}
          />
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  </ToastProvider>
);

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
    onExtendSessionOpenChange,
    requestedLimits,
  } = useSessionStateContext(args);

  const state = useMemo(
    () => ({
      sessionState,
      enableUnlimited: enableUnlimited ?? false,
      whitelistedTokens: args.tokens ?? [],
      onStartSessionInit,
    }),
    [sessionState, enableUnlimited, args.tokens, onStartSessionInit],
  );

  return (
    <>
      <SessionContext value={state}>{children}</SessionContext>
      {args.tokens !== undefined && args.tokens.length > 0 && (
        <ModalDialog
          heading="Session Limits"
          message="Limit how many tokens this app is allowed to interact with"
          isOpen={
            sessionState.type === StateType.RequestingLimits ||
            sessionState.type === StateType.SettingLimits
          }
          onOpenChange={onSessionLimitsOpenChange}
        >
          <SessionLimits
            enableUnlimited={enableUnlimited}
            tokens={args.tokens}
            onSubmit={
              sessionState.type === StateType.RequestingLimits
                ? sessionState.onSubmitLimits
                : undefined
            }
            initialLimits={
              requestedLimits ?? defaultRequestedLimits ?? new Map()
            }
            error={
              sessionState.type === StateType.RequestingLimits
                ? sessionState.error
                : undefined
            }
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
        </ModalDialog>
      )}
      <ModalDialog
        heading="Your session is expired"
        message="Would you like to extend your session?"
        isOpen={sessionState.type === StateType.RequestingExtendedExpiry}
        onOpenChange={onExtendSessionOpenChange}
      >
        {isEstablished(sessionState) && (
          <RenewSessionsContents
            sessionState={sessionState}
            enableUnlimited={enableUnlimited}
            whitelistedTokens={args.tokens ?? []}
          />
        )}
      </ModalDialog>
      <ModalDialog
        heading="This trade exceeds your set limits"
        message="Would you like to increase your session limits?"
        isOpen={sessionState.type === StateType.RequestingIncreasedLimits}
        onOpenChange={onExtendSessionOpenChange}
      >
        {isEstablished(sessionState) && (
          <RenewSessionsContents
            sessionState={sessionState}
            enableUnlimited={enableUnlimited}
            whitelistedTokens={args.tokens ?? []}
          />
        )}
      </ModalDialog>
    </>
  );
};

const RenewSessionsContents = ({
  sessionState,
  enableUnlimited,
  whitelistedTokens,
}: {
  sessionState: EstablishedSessionState;
  enableUnlimited?: boolean | undefined;
  whitelistedTokens: PublicKey[];
}) => {
  const state = useTokenAccountData(sessionState);

  switch (state.type) {
    case TokenDataStateType.Error: {
      return <div>{errorToString(state.error)}</div>;
    }
    case TokenDataStateType.Loaded: {
      return (
        <SessionLimits
          tokens={whitelistedTokens}
          initialLimits={
            new Map(
              state.data.sessionLimits.map(({ mint, sessionLimit }) => [
                mint,
                sessionLimit,
              ]),
            )
          }
          onSubmit={
            "updateSession" in sessionState
              ? sessionState.updateSession
              : undefined
          }
          buttonText="Extend Session"
          error={
            "updateSessionError" in sessionState
              ? sessionState.updateSessionError
              : undefined
          }
          {...(enableUnlimited && {
            enableUnlimited: true,
            isSessionUnlimited: !sessionState.isLimited,
          })}
        />
      );
    }
    case TokenDataStateType.NotLoaded:
    case TokenDataStateType.Loading: {
      return "Loading...";
    }
  }
};

const useSessionStateContext = ({
  tokens,
  ...adapterArgs
}: Parameters<typeof useSessionAdapter>[0] & {
  tokens?: PublicKey[] | undefined;
}) => {
  const [state, setState] = useState<SessionState>(SessionState.Initializing());
  const wallet = useWallet();
  const walletModal = useWalletModal();
  const requestedLimits = useRef<undefined | Map<PublicKey, bigint>>(undefined);
  const getAdapter = useSessionAdapter(adapterArgs);
  const toast = useToast();

  const establishSession = useCallback(
    (newLimits?: Map<PublicKey, bigint>) => {
      setState(SessionState.SelectingWallet());
      walletModal.setVisible(true);
      requestedLimits.current = newLimits;
    },
    [walletModal],
  );

  const disconnectWallet = useCallback(() => {
    wallet.disconnect().catch((error: unknown) => {
      // eslint-disable-next-line no-console
      console.error("An error occurred while disconnecting the wallet", error);
    });
  }, [wallet]);

  const endSession = useCallback(
    (walletPublicKey: PublicKey, session?: Session) => {
      const doRevokeSession = async () => {
        return session
          ? await revokeSession({
              adapter: await getAdapter(),
              session,
            })
          : undefined;
      };
      disconnectWallet();
      Promise.all([
        doRevokeSession(),
        clearStoredSession(walletPublicKey),
      ]).catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error("Failed to clean up session", error);
      });
    },
    [disconnectWallet],
  );

  const setSessionState = useCallback(
    (
      adapter: SessionAdapter,
      session: Session,
      signMessage: (message: Uint8Array) => Promise<Uint8Array>,
    ) => {
      setStoredSession({
        sessionKey: session.sessionKey,
        walletPublicKey: session.walletPublicKey,
      }).catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error("Failed to store session", error);
        disconnectWallet();
      });
      const establishedOptions: EstablishedOptions = {
        endSession: () => {
          endSession(session.walletPublicKey, session);
        },
        payer: session.payer,
        sendTransaction: async (instructions) => {
          const result = await session.sendTransaction(instructions);
          if (result.type === TransactionResultType.Failed) {
            const parsedError = instructionErrorCustomSchema.safeParse(
              result.error,
            );
            if (parsedError.success) {
              switch (parsedError.data.InstructionError[1].Custom) {
                case ERROR_CODE_SESSION_EXPIRED: {
                  setState(
                    SessionState.RequestingExtendedExpiry(
                      establishedOptions,
                      updateSession,
                    ),
                  );
                  break;
                }
                case ERROR_CODE_SESSION_LIMITS_EXCEEDED: {
                  setState(
                    SessionState.RequestingIncreasedLimits(
                      establishedOptions,
                      updateSession,
                    ),
                  );
                  break;
                }
              }
            }
          }
          mutate(getCacheKey(session.walletPublicKey)).catch(
            (error: unknown) => {
              // eslint-disable-next-line no-console
              console.error("Failed to update token account data", error);
            },
          );
          return result;
        },
        sessionKey: session.sessionKey,
        isLimited:
          session.sessionInfo.authorizedTokens === AuthorizedTokens.Specific,
        walletPublicKey: session.walletPublicKey,
        connection: adapter.connection,
        adapter,
        signMessage,
        sessionPublicKey: session.sessionPublicKey,
        createLogInToken: () => createLogInToken(session),
        expiration: session.sessionInfo.expiration,
      };
      const updateSession = (
        sessionDuration: number,
        limits?: Map<PublicKey, bigint>,
      ) => {
        setState(SessionState.UpdatingSession(establishedOptions));
        replaceSession({
          expires: new Date(Date.now() + sessionDuration),
          adapter,
          signMessage,
          session,
          ...(limits === undefined ? { unlimited: true } : { limits }),
        })
          .then((result) => {
            switch (result.type) {
              case SessionResultType.Success: {
                toast.success("Session updated successfully");
                setSessionState(adapter, result.session, signMessage);
                return;
              }
              case SessionResultType.Failed: {
                toast.error(
                  `Failed to update session: ${errorToString(result.error)}`,
                );
                setState(
                  SessionState.Established(establishedOptions, updateSession),
                );
                return;
              }
            }
          })
          .catch((error: unknown) => {
            toast.error(`Failed to replace session: ${errorToString(error)}`);
            setState(
              SessionState.Established(establishedOptions, updateSession),
            );
          });
      };
      setState(SessionState.Established(establishedOptions, updateSession));
    },
    [disconnectWallet, endSession, toast],
  );

  const checkStoredSession = useCallback(
    async (
      walletPublicKey: PublicKey,
      signMessage: (message: Uint8Array) => Promise<Uint8Array>,
    ) => {
      const adapter = await getAdapter();
      const storedSession = await getStoredSession(walletPublicKey);
      if (storedSession === undefined) {
        if (tokens === undefined || tokens.length === 0) {
          setState(SessionState.SettingLimits());
          try {
            const result = await establishSessionImpl({
              expires: new Date(Date.now() + DEFAULT_SESSION_DURATION),
              adapter,
              limits: new Map(),
              signMessage,
              walletPublicKey,
            });
            switch (result.type) {
              case SessionResultType.Success: {
                setSessionState(adapter, result.session, signMessage);
                return;
              }
              case SessionResultType.Failed: {
                // eslint-disable-next-line no-console
                console.error("Connection failed", result.error);
                endSession(walletPublicKey);
                return;
              }
            }
          } catch (error: unknown) {
            // eslint-disable-next-line no-console
            console.error("Failed to establish session", error);
            endSession(walletPublicKey);
          }
        } else {
          const setLimits = (
            sessionDuration: number,
            limits?: Map<PublicKey, bigint>,
          ) => {
            setState(SessionState.SettingLimits());
            establishSessionImpl({
              expires: new Date(Date.now() + sessionDuration),
              adapter,
              signMessage,
              walletPublicKey,
              ...(limits === undefined ? { unlimited: true } : { limits }),
            })
              .then((result) => {
                switch (result.type) {
                  case SessionResultType.Success: {
                    setSessionState(adapter, result.session, signMessage);
                    return;
                  }
                  case SessionResultType.Failed: {
                    setState(
                      SessionState.RequestingLimits(setLimits, result.error),
                    );
                    return;
                  }
                }
              })
              .catch((error: unknown) => {
                // eslint-disable-next-line no-console
                console.error("Failed to establish session", error);
                setState(SessionState.RequestingLimits(setLimits, error));
              });
          };
          setState(SessionState.RequestingLimits(setLimits));
        }
      } else {
        const session = await reestablishSession(
          adapter,
          storedSession.walletPublicKey,
          storedSession.sessionKey,
        );
        if (session === undefined) {
          endSession(walletPublicKey);
        } else {
          setSessionState(adapter, session, signMessage);
        }
      }
    },
    [getAdapter, setSessionState, endSession, tokens],
  );

  const onSessionLimitsOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && state.type === StateType.RequestingLimits) {
        disconnectWallet();
      }
    },
    [state, disconnectWallet],
  );

  const onExtendSessionOpenChange = useCallback(
    (isOpen: boolean) => {
      if (
        !isOpen &&
        (state.type === StateType.RequestingExtendedExpiry ||
          state.type === StateType.RequestingIncreasedLimits)
      ) {
        setState(
          SessionState.Established(
            {
              expiration: state.expiration,
              adapter: state.adapter,
              connection: state.connection,
              endSession: state.endSession,
              isLimited: state.isLimited,
              payer: state.payer,
              sendTransaction: state.sendTransaction,
              sessionKey: state.sessionKey,
              sessionPublicKey: state.sessionPublicKey,
              signMessage: state.signMessage,
              createLogInToken: state.createLogInToken,
              walletPublicKey: state.walletPublicKey,
            },
            state.updateSession,
          ),
        );
      }
    },
    [state],
  );

  useEffect(() => {
    if (!walletModal.visible) {
      setState((prevState) => {
        return prevState.type === StateType.SelectingWallet
          ? SessionState.NotEstablished(establishSession)
          : prevState;
      });
    }
  }, [walletModal.visible, establishSession]);

  useEffect(() => {
    switch (state.type) {
      case StateType.CheckingStoredSession: {
        checkStoredSession(state.walletPublicKey, state.signMessage).catch(
          (error: unknown) => {
            // eslint-disable-next-line no-console
            console.error("Failed to check stored session", error);
            disconnectWallet();
          },
        );
        return;
      }
    }
  }, [state, checkStoredSession, disconnectWallet]);

  useEffect(() => {
    setState(
      (prevState) =>
        getNextState(prevState, wallet, establishSession) ?? prevState,
    );
  }, [wallet, establishSession]);

  return useMemo(
    () => ({
      state,
      onSessionLimitsOpenChange,
      onExtendSessionOpenChange,
      requestedLimits: requestedLimits.current,
    }),
    [state, onSessionLimitsOpenChange, onExtendSessionOpenChange],
  );
};

const useSessionAdapter = (
  options: ConstrainedOmit<
    Parameters<typeof createSolanaWalletAdapter>[0],
    "connection"
  >,
) => {
  const { connection } = useConnection();
  const adapter = useRef<undefined | SessionAdapter>(undefined);
  return useCallback(async () => {
    if (adapter.current === undefined) {
      adapter.current = await createSolanaWalletAdapter({
        ...options,
        connection,
      });
      return adapter.current;
    } else {
      return adapter.current;
    }
  }, [connection, options]);
};

const getNextState = (
  state: SessionState,
  wallet: ReturnType<typeof useWallet>,
  establishSession: (requestedLimits?: Map<PublicKey, bigint>) => void,
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
      case StateType.UpdatingSession:
      case StateType.RequestingExtendedExpiry:
      case StateType.RequestingIncreasedLimits: {
        // This should be impossible
        throw new InvariantFailedError(
          `Invalid state change which should not be possible: wallet changed to connecting while state was ${showSessionState(state)}.`,
        );
      }
    }
  } else if (wallet.connected && !wallet.disconnecting) {
    if (wallet.publicKey === null || wallet.signMessage === undefined) {
      throw new InvariantFailedError(
        "Invalid wallet state returned from solana: connected but no public key or message signer.",
      );
    } else {
      switch (state.type) {
        case StateType.Initializing:
        case StateType.NotEstablished:
        case StateType.WalletConnecting:
        case StateType.SelectingWallet:
        case StateType.RequestingLimits:
        case StateType.UpdatingSession:
        case StateType.RequestingExtendedExpiry:
        case StateType.RequestingIncreasedLimits: {
          return SessionState.CheckingStoredSession(
            wallet.publicKey,
            wallet.signMessage,
          );
        }
        case StateType.Established: {
          return state.walletPublicKey.equals(wallet.publicKey)
            ? undefined
            : SessionState.CheckingStoredSession(
                wallet.publicKey,
                wallet.signMessage,
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
      case StateType.Initializing:
      case StateType.RequestingLimits:
      case StateType.SettingLimits:
      case StateType.UpdatingSession:
      case StateType.RequestingExtendedExpiry:
      case StateType.RequestingIncreasedLimits:
      case StateType.WalletConnecting:
      case StateType.SelectingWallet: {
        return SessionState.NotEstablished(establishSession);
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

export const useSession = () => useSessionContext().sessionState;

export enum StateType {
  Initializing,
  NotEstablished,
  SelectingWallet,
  WalletConnecting,
  CheckingStoredSession,
  RequestingLimits,
  SettingLimits,
  Established,
  UpdatingSession,
  RequestingExtendedExpiry,
  RequestingIncreasedLimits,
}

type EstablishedOptions = Pick<
  Session,
  | "walletPublicKey"
  | "sessionKey"
  | "sendTransaction"
  | "payer"
  | "sessionPublicKey"
> & {
  expiration: Date;
  adapter: SessionAdapter;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  createLogInToken: () => Promise<string>;
  connection: ReturnType<typeof useConnection>["connection"];
  isLimited: boolean;
  endSession: () => void;
};

const SessionState = {
  Initializing: () => ({ type: StateType.Initializing as const }),

  NotEstablished: (
    establishSession: (requestedLimits?: Map<PublicKey, bigint>) => void,
  ) => ({
    type: StateType.NotEstablished as const,
    establishSession,
  }),

  SelectingWallet: () => ({ type: StateType.SelectingWallet as const }),

  WalletConnecting: () => ({ type: StateType.WalletConnecting as const }),

  CheckingStoredSession: (
    walletPublicKey: PublicKey,
    signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  ) => ({
    type: StateType.CheckingStoredSession as const,
    walletPublicKey,
    signMessage,
  }),

  RequestingLimits: (
    onSubmitLimits: (duration: number, limits?: Map<PublicKey, bigint>) => void,
    error?: unknown,
  ) => ({
    type: StateType.RequestingLimits as const,
    onSubmitLimits,
    error,
  }),

  SettingLimits: () => ({ type: StateType.SettingLimits as const }),

  Established: (
    options: EstablishedOptions,
    updateSession: (duration: number, limits?: Map<PublicKey, bigint>) => void,
    updateSessionError?: unknown,
  ) => ({
    type: StateType.Established as const,
    ...options,
    updateSession,
    updateSessionError,
  }),

  UpdatingSession: (options: EstablishedOptions) => ({
    type: StateType.UpdatingSession as const,
    ...options,
  }),

  RequestingExtendedExpiry: (
    options: EstablishedOptions,
    updateSession: (duration: number, limits?: Map<PublicKey, bigint>) => void,
  ) => ({
    type: StateType.RequestingExtendedExpiry as const,
    ...options,
    updateSession,
  }),

  RequestingIncreasedLimits: (
    options: EstablishedOptions,
    updateSession: (duration: number, limits?: Map<PublicKey, bigint>) => void,
  ) => ({
    type: StateType.RequestingIncreasedLimits as const,
    ...options,
    updateSession,
  }),
};
export type SessionStates = {
  [key in keyof typeof SessionState]: ReturnType<(typeof SessionState)[key]>;
};
export type SessionState = SessionStates[keyof SessionStates];
export type EstablishedSessionState =
  | SessionStates["Established"]
  | SessionStates["UpdatingSession"]
  | SessionStates["RequestingExtendedExpiry"]
  | SessionStates["RequestingIncreasedLimits"];

const SESSION_STATE_NAME = {
  [StateType.Initializing]: "Initializing",
  [StateType.NotEstablished]: "NotEstablished",
  [StateType.SelectingWallet]: "SelectingWallet",
  [StateType.WalletConnecting]: "WalletConnecting",
  [StateType.CheckingStoredSession]: "CheckingStoredSession",
  [StateType.RequestingLimits]: "RequestingLimits",
  [StateType.SettingLimits]: "SettingLimits",
  [StateType.Established]: "Established",
  [StateType.UpdatingSession]: "UpdatingSession",
  [StateType.RequestingExtendedExpiry]: "RequestingExtendedExpiry",
  [StateType.RequestingIncreasedLimits]: "RequestingIncreasedLimits",
};

const showSessionState = (state: SessionState) =>
  SESSION_STATE_NAME[state.type];

export const isEstablished = (
  sessionState: SessionState,
): sessionState is EstablishedSessionState =>
  sessionState.type === StateType.Established ||
  sessionState.type === StateType.UpdatingSession ||
  sessionState.type === StateType.RequestingExtendedExpiry ||
  sessionState.type === StateType.RequestingIncreasedLimits;

class NotInitializedError extends Error {
  constructor() {
    super("This component must be contained within a <FogoSessionProvider>");
    this.name = "NotInitializedError";
  }
}

class InvariantFailedError extends Error {
  constructor(message: string) {
    super(`An expected invariant failed: ${message}`);
    this.name = "InvariantFailedError";
  }
}

type ConstrainedOmit<T, K> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [P in keyof T as Exclude<P, K & keyof any>]: T[P];
};

const instructionErrorCustomSchema = z.object({
  InstructionError: z.tuple([
    z.number(),
    z.object({
      Custom: z.number(),
    }),
  ]),
});
