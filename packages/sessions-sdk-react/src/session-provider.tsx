"use client";

import type { Session, SessionAdapter } from "@fogo/sessions-sdk";
import {
  establishSession as establishSessionImpl,
  replaceSession,
  createSolanaWalletAdapter,
  SessionResultType,
  reestablishSession,
  AuthorizedTokens,
} from "@fogo/sessions-sdk";
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
} from "@fogo/sessions-sdk-web";
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
  CoinbaseWalletAdapter,
  LedgerWalletAdapter,
  TorusWalletAdapter,
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
import { Dialog, Heading, Modal, ModalOverlay } from "react-aria-components";
import { mutate } from "swr";

import {
  deserializePublicKey,
  deserializePublicKeyList,
  deserializePublicKeyMap,
} from "./deserialize-public-key.js";
import { SessionLimits } from "./session-limits.js";
import styles from "./session-provider.module.css";
import { TokenWhitelistProvider } from "./token-whitelist-provider.js";
import { getCacheKey } from "./use-token-account-data.js";

import "@solana/wallet-adapter-react-ui/styles.css";

const ONE_SECOND_IN_MS = 1000;
const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;
const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS;
const ONE_DAY_IN_MS = 24 * ONE_HOUR_IN_MS;
const SESSION_DURATION = 14 * ONE_DAY_IN_MS;

type Props = Omit<
  ComponentProps<typeof SessionProvider>,
  "sponsor" | "tokens" | "defaultRequestedLimits"
> & {
  sponsor: PublicKey | string;
  endpoint: string;
  tokens?: (PublicKey | string)[] | undefined;
  defaultRequestedLimits?:
    | Map<PublicKey, bigint>
    | Record<string, bigint>
    | undefined;
  enableUnlimited?: boolean | undefined;
};

export const FogoSessionProvider = ({
  endpoint,
  sponsor,
  tokens,
  defaultRequestedLimits,
  ...props
}: Props) => {
  const wallets = useMemo(
    () => [
      new CoinbaseWalletAdapter(),
      new LedgerWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <TokenWhitelistProvider
            value={{
              enableUnlimited: props.enableUnlimited ?? false,
              tokens: tokens ? deserializePublicKeyList(tokens) : [],
            }}
          >
            <SessionProvider
              sponsor={deserializePublicKey(sponsor)}
              tokens={tokens ? deserializePublicKeyList(tokens) : undefined}
              defaultRequestedLimits={
                defaultRequestedLimits === undefined
                  ? undefined
                  : deserializePublicKeyMap(defaultRequestedLimits)
              }
              {...props}
            />
          </TokenWhitelistProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

const SessionProvider = ({
  children,
  defaultRequestedLimits,
  enableUnlimited,
  ...args
}: Parameters<typeof useSessionStateContext>[0] & {
  children: ReactNode;
  defaultRequestedLimits?: Map<PublicKey, bigint> | undefined;
  enableUnlimited?: boolean | undefined;
}) => {
  const { state, onSessionLimitsOpenChange, requestedLimits } =
    useSessionStateContext(args);

  return (
    <>
      <SessionContext value={state}>{children}</SessionContext>
      {args.tokens !== undefined && args.tokens.length > 0 && (
        <ModalOverlay
          isDismissable
          className={styles.sessionLimitsModalOverlay ?? ""}
          isOpen={
            state.type === StateType.RequestingLimits ||
            state.type === StateType.SettingLimits
          }
          onOpenChange={onSessionLimitsOpenChange}
        >
          <Modal isDismissable className={styles.modal ?? ""}>
            <Dialog className={styles.dialog ?? ""}>
              <Heading slot="title" className={styles.heading ?? ""}>
                Session Limits
              </Heading>
              <p className={styles.message}>
                Limit how many tokens this app is allowed to interact with
              </p>
              <SessionLimits
                enableUnlimited={enableUnlimited}
                tokens={args.tokens}
                onSubmit={
                  state.type === StateType.RequestingLimits
                    ? state.onSubmitLimits
                    : undefined
                }
                initialLimits={
                  requestedLimits ?? defaultRequestedLimits ?? new Map()
                }
                error={
                  state.type === StateType.RequestingLimits
                    ? state.error
                    : undefined
                }
              />
            </Dialog>
          </Modal>
        </ModalOverlay>
      )}
    </>
  );
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
    (walletPublicKey: PublicKey) => {
      clearStoredSession(walletPublicKey).catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error("Failed to check stored session", error);
        disconnectWallet();
      });
      disconnectWallet();
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
                // eslint-disable-next-line no-console
                console.error("Failed to update token account data", error);
              },
            );
            return result;
          },
          sessionPublicKey: session.sessionPublicKey,
          isLimited:
            session.sessionInfo.authorizedTokens === AuthorizedTokens.Specific,
          walletPublicKey: session.walletPublicKey,
          connection: adapter.connection,
        };
      const setLimits = (limits?: Map<PublicKey, bigint>) => {
        setState(SessionState.UpdatingLimits(commonStateArgs));
        replaceSession({
          expires: new Date(Date.now() + SESSION_DURATION),
          adapter,
          signMessage,
          session,
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
                  SessionState.Established(
                    {
                      ...commonStateArgs,
                      setLimits,
                    },
                    result.error,
                  ),
                );
                return;
              }
            }
          })
          .catch((error: unknown) => {
            // eslint-disable-next-line no-console
            console.error("Failed to replace session", error);
            setState(
              SessionState.Established(
                { ...commonStateArgs, setLimits },
                error,
              ),
            );
          });
      };
      setState(SessionState.Established({ ...commonStateArgs, setLimits }));
    },
    [disconnectWallet, endSession],
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
              expires: new Date(Date.now() + SESSION_DURATION),
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
                disconnectWallet();
                return;
              }
            }
          } catch (error: unknown) {
            // eslint-disable-next-line no-console
            console.error("Failed to establish session", error);
            disconnectWallet();
          }
        } else {
          const setLimits = (limits?: Map<PublicKey, bigint>) => {
            setState(SessionState.SettingLimits());
            establishSessionImpl({
              expires: new Date(Date.now() + SESSION_DURATION),
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
          disconnectWallet();
        } else {
          setSessionState(adapter, session, signMessage);
        }
      }
    },
    [getAdapter, setSessionState, disconnectWallet, tokens],
  );

  const onSessionLimitsOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen && state.type === StateType.RequestingLimits) {
        disconnectWallet();
      }
    },
    [state, disconnectWallet],
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
      requestedLimits: requestedLimits.current,
    }),
    [state, onSessionLimitsOpenChange],
  );
};

const useSessionAdapter = (options: {
  paymasterUrl: string;
  sponsor: PublicKey;
  addressLookupTableAddress?: string | undefined;
  domain?: string | undefined;
}) => {
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
      case StateType.RestoringSession:
      case StateType.RequestingLimits:
      case StateType.SettingLimits:
      case StateType.UpdatingLimits: {
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
        case StateType.Established:
        case StateType.RestoringSession:
        case StateType.RequestingLimits:
        case StateType.UpdatingLimits: {
          return SessionState.CheckingStoredSession(
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
      case StateType.RestoringSession:
      case StateType.RequestingLimits:
      case StateType.SettingLimits:
      case StateType.UpdatingLimits:
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

const SessionContext = createContext<SessionState | undefined>(undefined);

export const useSession = () => {
  const value = use(SessionContext);
  if (value === undefined) {
    throw new NotInitializedError();
  } else {
    return value;
  }
};

export enum StateType {
  Initializing,
  NotEstablished,
  SelectingWallet,
  WalletConnecting,
  CheckingStoredSession,
  RestoringSession,
  RequestingLimits,
  SettingLimits,
  Established,
  UpdatingLimits,
}

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

  RestoringSession: () => ({ type: StateType.RestoringSession as const }),

  RequestingLimits: (
    onSubmitLimits: (limits?: Map<PublicKey, bigint>) => void,
    error?: unknown,
  ) => ({
    type: StateType.RequestingLimits as const,
    onSubmitLimits,
    error,
  }),

  SettingLimits: () => ({ type: StateType.SettingLimits as const }),

  Established: (
    options: Pick<
      Session,
      "walletPublicKey" | "sessionPublicKey" | "sendTransaction" | "payer"
    > & {
      connection: ReturnType<typeof useConnection>["connection"];
      isLimited: boolean;
      setLimits: (limits?: Map<PublicKey, bigint>) => void;
      endSession: () => void;
    },
    updateLimitsError?: unknown,
  ) => ({
    type: StateType.Established as const,
    ...options,
    updateLimitsError,
  }),

  UpdatingLimits: (
    options: Pick<
      Session,
      "walletPublicKey" | "sessionPublicKey" | "sendTransaction" | "payer"
    > & {
      connection: ReturnType<typeof useConnection>["connection"];
      isLimited: boolean;
      endSession: () => void;
    },
  ) => ({ type: StateType.UpdatingLimits as const, ...options }),
};
export type SessionStates = {
  [key in keyof typeof SessionState]: ReturnType<(typeof SessionState)[key]>;
};
export type SessionState = SessionStates[keyof SessionStates];
export type EstablishedSessionState =
  | SessionStates["Established"]
  | SessionStates["UpdatingLimits"];

const SESSION_STATE_NAME = {
  [StateType.Initializing]: "Initializing",
  [StateType.NotEstablished]: "NotEstablished",
  [StateType.SelectingWallet]: "SelectingWallet",
  [StateType.WalletConnecting]: "WalletConnecting",
  [StateType.CheckingStoredSession]: "CheckingStoredSession",
  [StateType.RestoringSession]: "RestoringSession",
  [StateType.RequestingLimits]: "RequestingLimits",
  [StateType.SettingLimits]: "SettingLimits",
  [StateType.Established]: "Established",
  [StateType.UpdatingLimits]: "UpdatingLimits",
};

const showSessionState = (state: SessionState) =>
  SESSION_STATE_NAME[state.type];

export const isEstablished = (
  sessionState: SessionState,
): sessionState is EstablishedSessionState =>
  sessionState.type === StateType.Established ||
  sessionState.type === StateType.UpdatingLimits;

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
