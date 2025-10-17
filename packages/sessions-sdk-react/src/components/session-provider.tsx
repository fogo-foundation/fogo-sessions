"use client";

import type {
  Session,
  SessionContext as SessionExecutionContext,
} from "@fogo/sessions-sdk";
import {
  establishSession as establishSessionImpl,
  replaceSession,
  createSessionContext,
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
import { useLocalStorageValue, useMountEffect } from "@react-hookz/web";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import type { MessageSignerWalletAdapterProps } from "@solana/wallet-adapter-base";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import {
  ConnectionProvider,
  useConnection,
} from "@solana/wallet-adapter-react";
import {
  SolflareWalletAdapter,
  PhantomWalletAdapter,
  NightlyWalletAdapter,
  BitgetWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { useStandardWalletAdapters } from "@solana/wallet-standard-wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
  SolanaMobileWalletAdapter,
  SolanaMobileWalletAdapterWalletName,
} from "@solana-mobile/wallet-adapter-mobile";
import type { ComponentProps, ReactNode } from "react";
import { useMemo, useCallback, useState } from "react";
import { mutate } from "swr";
import { z } from "zod";

import {
  deserializePublicKey,
  deserializePublicKeyList,
  deserializePublicKeyMap,
} from "../deserialize-public-key.js";
import { errorToString } from "../error-to-string.js";
import type { EstablishedOptions, StateType } from "../session-state.js";
import { RenewSessionModal } from "./renew-session-modal.js";
import { SignInModal } from "./sign-in-modal.js";
import { ToastProvider, useToast } from "./toast.js";
import { SessionContext as SessionReactContext } from "../hooks/use-session.js";
import { getCacheKey } from "../hooks/use-token-account-data.js";
import { SessionState } from "../session-state.js";

const ONE_SECOND_IN_MS = 1000;
const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;
const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS;
const ONE_DAY_IN_MS = 24 * ONE_HOUR_IN_MS;
const DEFAULT_SESSION_DURATION = 7 * ONE_DAY_IN_MS;

const ERROR_CODE_SESSION_EXPIRED = 4_000_000_000;
const ERROR_CODE_SESSION_LIMITS_EXCEEDED = 4_000_000_008;

type Props = ConstrainedOmit<
  ComponentProps<typeof SessionProvider>,
  | "sponsor"
  | "tokens"
  | "defaultRequestedLimits"
  | "wallets"
  | "paymaster"
  | "sendToPaymaster"
> & {
  endpoint: string;
  tokens?: (PublicKey | string)[] | undefined;
  defaultRequestedLimits?:
    | Map<PublicKey, bigint>
    | Record<string, bigint>
    | undefined;
  wallets?: MessageSignerWalletAdapterProps[] | undefined;
  termsOfServiceUrl?: string | undefined;
  privacyPolicyUrl?: string | undefined;
} & (
    | {
        paymaster: ComponentProps<typeof SessionProvider>["paymaster"];
        sendToPaymaster?: undefined;
        sponsor?: undefined;
      }
    | {
        paymaster?: undefined;
        sendToPaymaster: NonNullable<
          ComponentProps<typeof SessionProvider>["sendToPaymaster"]
        >;
        sponsor: PublicKey | string;
      }
  );

export const FogoSessionProvider = ({
  endpoint,
  tokens,
  defaultRequestedLimits,
  children,
  paymaster,
  sendToPaymaster,
  sponsor,
  wallets = [
    new NightlyWalletAdapter(),
    new PhantomWalletAdapter(),
    new BitgetWalletAdapter(),
    new BackpackWalletAdapter(),
    new SolflareWalletAdapter(),
  ],
  termsOfServiceUrl,
  privacyPolicyUrl,
  ...props
}: Props) => {
  // We have to typecast this unfortunately because the Solana library typings are broken
  const walletsWithStandardAdapters = useStandardWalletAdapters(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
    wallets as any,
  ) as unknown as MessageSignerWalletAdapterProps[];

  const mobileWalletAdapter = useMemo(
    () =>
      isMobile(walletsWithStandardAdapters)
        ? (walletsWithStandardAdapters.find(
            (adapter) => adapter.name === SolanaMobileWalletAdapterWalletName,
          ) ??
          new SolanaMobileWalletAdapter({
            addressSelector: createDefaultAddressSelector(),
            appIdentity: {
              uri:
                // eslint-disable-next-line unicorn/no-typeof-undefined
                typeof globalThis.window === "undefined"
                  ? ""
                  : `${globalThis.window.location.protocol}//${globalThis.window.location.host}`,
            },
            authorizationResultCache: createDefaultAuthorizationResultCache(),
            chain: "mainnet-beta",
            onWalletNotFound: createDefaultWalletNotFoundHandler(),
          }))
        : undefined,
    [walletsWithStandardAdapters],
  );

  const walletsWithMobileAdapter = useMemo(
    () =>
      mobileWalletAdapter == undefined
        ? walletsWithStandardAdapters
        : [mobileWalletAdapter, ...walletsWithStandardAdapters],
    [walletsWithStandardAdapters, mobileWalletAdapter],
  );

  return (
    <ToastProvider>
      <ConnectionProvider endpoint={endpoint}>
        <SessionProvider
          tokens={tokens ? deserializePublicKeyList(tokens) : undefined}
          defaultRequestedLimits={
            defaultRequestedLimits === undefined
              ? undefined
              : deserializePublicKeyMap(defaultRequestedLimits)
          }
          wallets={walletsWithMobileAdapter}
          {...(sendToPaymaster === undefined
            ? { paymaster }
            : {
                sendToPaymaster,
                sponsor:
                  typeof sponsor === "string"
                    ? deserializePublicKey(sponsor)
                    : sponsor,
              })}
          {...props}
        >
          {children}
          <SignInModal
            wallets={walletsWithMobileAdapter}
            termsOfServiceUrl={termsOfServiceUrl}
            privacyPolicyUrl={privacyPolicyUrl}
          />
          <RenewSessionModal />
        </SessionProvider>
      </ConnectionProvider>
    </ToastProvider>
  );
};

// Taken from https://github.com/anza-xyz/wallet-adapter/blob/master/packages/core/react/src/getEnvironment.ts
const ANDROID_REGEX = /android/i;
const WEBVIEW_REGEX =
  /(WebView|Version\/.+(Chrome)\/(\d+)\.(\d+)\.(\d+)\.(\d+)|; wv\).+(Chrome)\/(\d+)\.(\d+)\.(\d+)\.(\d+))/i;
const isMobile = (wallets: MessageSignerWalletAdapterProps[]) => {
  if (
    wallets.some(
      (wallet) =>
        wallet.name !== SolanaMobileWalletAdapterWalletName &&
        wallet.readyState === WalletReadyState.Installed,
    )
  ) {
    return false;
  } else {
    const { userAgent } = globalThis.navigator;
    return ANDROID_REGEX.test(userAgent) && !WEBVIEW_REGEX.test(userAgent);
  }
};

const SessionProvider = ({
  children,
  defaultRequestedLimits,
  enableUnlimited,
  onStartSessionInit,
  addressLookupTableAddress,
  domain,
  paymaster,
  sendToPaymaster,
  sponsor,
  ...args
}: ConstrainedOmit<Parameters<typeof createSessionContext>[0], "connection"> &
  Omit<Parameters<typeof useSessionState>[0], "getSessionContext"> & {
    children: ReactNode;
    defaultRequestedLimits?: Map<PublicKey, bigint> | undefined;
    enableUnlimited?: boolean | undefined;
    onStartSessionInit?:
      | (() => Promise<boolean> | boolean)
      | (() => Promise<void> | void)
      | undefined;
  }) => {
  const { connection } = useConnection();
  const sessionContext = useMemo(
    () =>
      // eslint-disable-next-line unicorn/no-typeof-undefined
      typeof globalThis.window === "undefined"
        ? undefined
        : createSessionContext({
            connection,
            addressLookupTableAddress,
            domain,
            ...(sendToPaymaster === undefined
              ? { paymaster }
              : {
                  sendToPaymaster,
                  sponsor,
                }),
          }),
    [
      connection,
      addressLookupTableAddress,
      domain,
      paymaster,
      sendToPaymaster,
      sponsor,
    ],
  );
  const getSessionContext = useCallback(async () => {
    if (sessionContext === undefined) {
      throw new BrowserOnlyError();
    } else {
      return await sessionContext;
    }
  }, [sessionContext]);

  const sessionState = useSessionState({ ...args, getSessionContext });

  const state = useMemo(
    () => ({
      getSessionContext,
      sessionState,
      enableUnlimited: enableUnlimited ?? false,
      whitelistedTokens: args.tokens ?? [],
      onStartSessionInit,
      defaultRequestedLimits,
    }),
    [
      getSessionContext,
      sessionState,
      enableUnlimited,
      args.tokens,
      onStartSessionInit,
      defaultRequestedLimits,
    ],
  );

  return <SessionReactContext value={state}>{children}</SessionReactContext>;
};

const useSessionState = ({
  tokens,
  getSessionContext,
  onOpenExtendSessionExpiry,
  onOpenSessionLimitsReached,
  wallets,
}: {
  getSessionContext: () => Promise<SessionExecutionContext>;
  tokens?: PublicKey[] | undefined;
  onOpenExtendSessionExpiry?: (() => void) | undefined;
  onOpenSessionLimitsReached?: (() => void) | undefined;
  wallets: MessageSignerWalletAdapterProps[];
}) => {
  const [state, setState] = useState<SessionState>(SessionState.Initializing());
  const { connection } = useConnection();
  const toast = useToast();
  const walletName = useLocalStorageValue<string>("walletName");

  const sendTransaction = useCallback(
    async (
      session: Session,
      instructions: Parameters<EstablishedOptions["sendTransaction"]>[0],
      establishedOptions: EstablishedOptions,
    ) => {
      const result = await session.sendTransaction(instructions);
      if (result.type === TransactionResultType.Failed) {
        const parsedError = instructionErrorCustomSchema.safeParse(
          result.error,
        );
        if (parsedError.success) {
          switch (parsedError.data.InstructionError[1].Custom) {
            case ERROR_CODE_SESSION_EXPIRED: {
              onOpenExtendSessionExpiry?.();
              setState(
                SessionState.RequestingExtendedExpiry({
                  ...establishedOptions,
                  cancel: () => {
                    setState(SessionState.Established(establishedOptions));
                  },
                }),
              );
              break;
            }
            case ERROR_CODE_SESSION_LIMITS_EXCEEDED: {
              onOpenSessionLimitsReached?.();
              setState(
                SessionState.RequestingIncreasedLimits({
                  ...establishedOptions,
                  cancel: () => {
                    setState(SessionState.Established(establishedOptions));
                  },
                }),
              );
              break;
            }
          }
        }
      } else {
        try {
          await mutate(getCacheKey(session.walletPublicKey));
        } catch (error: unknown) {
          toast.error(
            "We couldn't update your token balances, please try refreshing the page",
            errorToString(error),
          );
          // eslint-disable-next-line no-console
          console.error("Failed to update token account data", error);
        }
      }
      return result;
    },
    [onOpenExtendSessionExpiry, onOpenSessionLimitsReached, toast],
  );

  const updateSession = useCallback(
    ({
      previousState,
      duration,
      establishedOptions,
      limits,
      session,
      onSuccess,
    }: {
      previousState: StateType;
      session: Session;
      establishedOptions: EstablishedOptions;
      duration: number;
      limits: Map<PublicKey, bigint> | undefined;
      onSuccess: (session: Session) => void;
    }) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { updateSession, ...updatingOptions } = establishedOptions;
      setState(
        SessionState.UpdatingSession({ ...updatingOptions, previousState }),
      );
      getSessionContext()
        .then((context) =>
          replaceSession({
            expires: new Date(Date.now() + duration),
            context,
            signMessage: establishedOptions.signMessage,
            session,
            ...(limits === undefined ? { unlimited: true } : { limits }),
          }),
        )
        .then((result) => {
          switch (result.type) {
            case SessionResultType.Success: {
              toast.success("Session updated successfully");
              onSuccess(result.session);
              return;
            }
            case SessionResultType.Failed: {
              toast.error(
                "Failed to update session",
                errorToString(result.error),
              );
              setState(SessionState.Established(establishedOptions));
              return;
            }
          }
        })
        .catch((error: unknown) => {
          toast.error("Failed to update session", errorToString(error));
          setState(SessionState.Established(establishedOptions));
        });
    },
    [getSessionContext, toast],
  );

  const completeSessionSetup = useCallback(
    (
      session: Session,
      wallet: MessageSignerWalletAdapterProps,
      onEndSession: () => void,
    ) => {
      setStoredSession({
        sessionKey: session.sessionKey,
        walletPublicKey: session.walletPublicKey,
      }).catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error("Failed to persist session", error);
      });
      const establishedOptions: EstablishedOptions = {
        endSession: () => {
          disconnect(wallet, { session, sessionContext: getSessionContext() });
          onEndSession();
        },
        payer: session.payer,
        sendTransaction: (instructions) =>
          sendTransaction(session, instructions, establishedOptions),
        sessionKey: session.sessionKey,
        isLimited:
          session.sessionInfo.authorizedTokens === AuthorizedTokens.Specific,
        walletPublicKey: session.walletPublicKey,
        connection,
        signMessage: (message: Uint8Array) => wallet.signMessage(message),
        sessionPublicKey: session.sessionPublicKey,
        createLogInToken: () => createLogInToken(session),
        expiration: session.sessionInfo.expiration,
        updateSession: (previousState, duration, limits) => {
          updateSession({
            previousState,
            duration,
            limits,
            establishedOptions,
            session,
            onSuccess: (newSession) => {
              completeSessionSetup(newSession, wallet, onEndSession);
            },
          });
        },
      };
      setState(SessionState.Established(establishedOptions));
    },
    [getSessionContext, updateSession, sendTransaction, connection],
  );

  const submitLimits = useCallback(
    ({
      wallet,
      walletPublicKey,
      sessionDuration,
      limits,
      onCancel,
      onError,
    }: {
      wallet: MessageSignerWalletAdapterProps;
      walletPublicKey: PublicKey;
      sessionDuration: number;
      limits?: Map<PublicKey, bigint> | undefined;
      onCancel: () => void;
      onError: () => void;
    }) => {
      const controller = new AbortController();
      setState(
        SessionState.SettingLimits({
          cancel: () => {
            controller.abort();
            disconnect(wallet);
            onCancel();
          },
        }),
      );
      establishSession(
        getSessionContext(),
        wallet,
        walletPublicKey,
        sessionDuration,
        limits,
        controller.signal,
      )
        .then((session) => {
          if (session !== undefined) {
            completeSessionSetup(session, wallet, onCancel);
          }
        })
        .catch((error: unknown) => {
          // eslint-disable-next-line no-console
          console.error("Failed to establish session", error);
          toast.error(
            "Failed to establish session, please try again",
            errorToString(error),
          );
          onError();
        });
    },
    [getSessionContext, completeSessionSetup, toast],
  );

  const requestLimits = useCallback(
    (
      wallet: MessageSignerWalletAdapterProps,
      walletPublicKey: PublicKey,
      requestedLimits: Map<PublicKey, bigint> | undefined,
      onCancel: () => void,
    ) => {
      setState(
        SessionState.RequestingLimits({
          requestedLimits,
          cancel: () => {
            disconnect(wallet);
            onCancel();
          },
          submitLimits: (sessionDuration, limits) => {
            submitLimits({
              wallet,
              walletPublicKey,
              sessionDuration,
              limits,
              onCancel,
              onError: () => {
                requestLimits(
                  wallet,
                  walletPublicKey,
                  requestedLimits,
                  onCancel,
                );
              },
            });
          },
        }),
      );
    },
    [submitLimits],
  );

  const connectWallet = useCallback(
    ({
      wallet,
      requestedLimits,
      onCancel,
      onError,
    }: {
      wallet: MessageSignerWalletAdapterProps;
      requestedLimits?: Map<PublicKey, bigint> | undefined;
      onCancel: () => void;
      onError: () => void;
    }) => {
      const controller = new AbortController();
      setState(
        SessionState.WalletConnecting({
          cancel: () => {
            controller.abort();
            onCancel();
          },
        }),
      );
      connectWalletImpl(getSessionContext(), wallet, controller.signal)
        .then((result) => {
          switch (result.type) {
            case ConnectWalletStateType.RestoredSession: {
              walletName.set(wallet.name);
              completeSessionSetup(result.session, wallet, onCancel);
              return;
            }
            case ConnectWalletStateType.Connected: {
              walletName.set(wallet.name);
              if (tokens === undefined || tokens.length === 0) {
                submitLimits({
                  sessionDuration: DEFAULT_SESSION_DURATION,
                  wallet,
                  walletPublicKey: result.walletPublicKey,
                  onError,
                  onCancel,
                });
              } else {
                requestLimits(
                  wallet,
                  result.walletPublicKey,
                  requestedLimits,
                  onCancel,
                );
              }
              return;
            }
            case ConnectWalletStateType.Aborted: {
              return;
            }
          }
        })
        .catch((error: unknown) => {
          toast.error("Failed to connect wallet", errorToString(error));
          onError();
        });
    },
    [
      getSessionContext,
      completeSessionSetup,
      requestLimits,
      submitLimits,
      toast,
      tokens,
      walletName,
    ],
  );

  const requestWallet = useCallback(
    (requestedLimits?: Map<PublicKey, bigint>) => {
      const cancel = () => {
        setState(SessionState.NotEstablished(requestWallet));
      };
      setState(
        SessionState.SelectingWallet({
          cancel,
          selectWallet: (wallet) => {
            connectWallet({
              wallet,
              requestedLimits,
              onCancel: cancel,
              onError: () => {
                requestWallet(requestedLimits);
              },
            });
          },
        }),
      );
    },
    [connectWallet],
  );

  useMountEffect(() => {
    if (walletName.value === undefined) {
      setState(SessionState.NotEstablished(requestWallet));
    } else {
      const wallet = wallets.find((wallet) => wallet.name === walletName.value);
      if (wallet === undefined) {
        setState(SessionState.NotEstablished(requestWallet));
      } else {
        setState(SessionState.CheckingStoredSession());
        checkStoredSession(getSessionContext(), wallet)
          .then((session) => {
            if (session === undefined) {
              setState(SessionState.NotEstablished(requestWallet));
            } else {
              completeSessionSetup(session, wallet, () => {
                setState(SessionState.NotEstablished(requestWallet));
              });
            }
          })
          .catch((error: unknown) => {
            // eslint-disable-next-line
            console.error("Failed to restore stored session", error);
            setState(SessionState.NotEstablished(requestWallet));
          });
      }
    }
  });

  return state;
};

const checkStoredSession = async (
  sessionContext: Promise<SessionExecutionContext>,
  wallet: MessageSignerWalletAdapterProps,
) => {
  await wallet.autoConnect();
  if (wallet.publicKey === null) {
    return;
  } else {
    const result = await tryLoadStoredSession(
      sessionContext,
      wallet,
      wallet.publicKey,
    );
    switch (result.type) {
      case ConnectWalletStateType.Connected: {
        await wallet.disconnect();
        return;
      }
      case ConnectWalletStateType.RestoredSession: {
        return result.session;
      }
      case ConnectWalletStateType.Aborted: {
        return;
      }
    }
  }
};

const connectWalletImpl = async (
  sessionContext: Promise<SessionExecutionContext>,
  wallet: MessageSignerWalletAdapterProps,
  abortSignal: AbortSignal,
) => {
  await wallet.connect();
  if (abortSignal.aborted || !wallet.connected) {
    await wallet.disconnect();
    return ConnectWalletState.Aborted();
  } else {
    const walletPublicKey = ensureWalletPublicKey(wallet);
    return tryLoadStoredSession(
      sessionContext,
      wallet,
      walletPublicKey,
      abortSignal,
    );
  }
};

const tryLoadStoredSession = async (
  sessionContext: Promise<SessionExecutionContext>,
  wallet: MessageSignerWalletAdapterProps,
  walletPublicKey: PublicKey,
  abortSignal?: AbortSignal,
) => {
  const storedSession = await getStoredSession(walletPublicKey);
  if (abortSignal?.aborted) {
    await wallet.disconnect();
    return ConnectWalletState.Aborted();
  } else if (storedSession === undefined) {
    return ConnectWalletState.Connected(walletPublicKey);
  } else {
    const session = await reestablishSession(
      await sessionContext,
      storedSession.walletPublicKey,
      storedSession.sessionKey,
    );
    if (abortSignal?.aborted) {
      await wallet.disconnect();
      return ConnectWalletState.Aborted();
    } else if (session === undefined) {
      await clearStoredSession(walletPublicKey);
      return ConnectWalletState.Connected(walletPublicKey);
    } else {
      return ConnectWalletState.RestoredSession(session);
    }
  }
};

enum ConnectWalletStateType {
  // Indicates that the request to connect a wallet was aborted before
  // completing (e.g. the user closed the wallet connection modal)
  Aborted,

  // Indicates that the wallet connected and we found a valid stored session
  // which has been restored
  RestoredSession,

  // Indicates that the wallet is connected (but no stored session was found, so
  // we need to request limits and create a session)
  Connected,
}

const ConnectWalletState = {
  Aborted: () => ({ type: ConnectWalletStateType.Aborted as const }),
  RestoredSession: (session: Session) => ({
    type: ConnectWalletStateType.RestoredSession as const,
    session,
  }),
  Connected: (walletPublicKey: PublicKey) => ({
    type: ConnectWalletStateType.Connected as const,
    walletPublicKey,
  }),
};

const establishSession = async (
  sessionContext: Promise<SessionExecutionContext>,
  wallet: MessageSignerWalletAdapterProps,
  walletPublicKey: PublicKey,
  sessionDuration: number,
  limits: Map<PublicKey, bigint> | undefined,
  abortSignal: AbortSignal,
) => {
  const context = await sessionContext;
  const result = await establishSessionImpl({
    expires: new Date(Date.now() + sessionDuration),
    context,
    signMessage: (message: Uint8Array) => wallet.signMessage(message),
    walletPublicKey: walletPublicKey,
    ...(limits === undefined ? { unlimited: true } : { limits }),
  });
  switch (result.type) {
    case SessionResultType.Success: {
      if (abortSignal.aborted) {
        // Use promise `.catch` here so that we don't block
        revokeSession({ context, session: result.session }).catch(
          (error: unknown) => {
            // eslint-disable-next-line no-console
            console.error("Failed to revoke cancelled session", error);
          },
        );
        return;
      } else {
        return result.session;
      }
    }
    case SessionResultType.Failed: {
      if (abortSignal.aborted) {
        return;
      } else {
        throw new Error(JSON.stringify(result.error));
      }
    }
  }
};

const disconnect = (
  wallet: MessageSignerWalletAdapterProps,
  sessionInfo?: {
    session: Session;
    sessionContext: Promise<SessionExecutionContext>;
  },
) => {
  Promise.all([
    wallet.disconnect(),
    ...(sessionInfo === undefined
      ? []
      : [
          sessionInfo.sessionContext.then((context) =>
            revokeSession({ context, session: sessionInfo.session }),
          ),
          clearStoredSession(sessionInfo.session.walletPublicKey),
        ]),
  ]).catch((error: unknown) => {
    // eslint-disable-next-line no-console
    console.error("Failed to clean up session", error);
  });
};

const ensureWalletPublicKey = (wallet: MessageSignerWalletAdapterProps) => {
  if (wallet.publicKey === null) {
    throw new InvariantFailedError("Wallet connected but has no public key");
  } else {
    return wallet.publicKey;
  }
};

class InvariantFailedError extends Error {
  constructor(message: string) {
    super(`An expected invariant failed: ${message}`);
    this.name = "InvariantFailedError";
  }
}

class BrowserOnlyError extends Error {
  constructor() {
    super(``);
    this.name = "BrowserOnlyError";
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
