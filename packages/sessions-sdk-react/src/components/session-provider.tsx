"use client";

import type {
  Network,
  SendTransactionOptions,
  Session,
  SessionContext,
  SessionContext as SessionExecutionContext,
  TransactionOrInstructions,
} from "@fogo/sessions-sdk";
import {
  AuthorizedTokens,
  createLogInToken,
  createSessionConnection,
  createSessionContext,
  establishSession as establishSessionImpl,
  reestablishSession,
  replaceSession,
  revokeSession,
  SessionResultType,
  TransactionResultType,
} from "@fogo/sessions-sdk";
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
} from "@fogo/sessions-sdk-web";
import { useLocalStorageValue } from "@react-hookz/web";
import { BackpackWalletAdapter } from "@solana/wallet-adapter-backpack";
import type {
  BaseWalletAdapter,
  MessageSignerWalletAdapterProps,
} from "@solana/wallet-adapter-base";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import {
  BitgetWalletAdapter,
  NightlyWalletAdapter,
  PhantomWalletAdapter,
  SolflareWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { useStandardWalletAdapters } from "@solana/wallet-standard-wallet-adapter-react";
import type { PublicKey } from "@solana/web3.js";
import {
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
  SolanaMobileWalletAdapter,
  SolanaMobileWalletAdapterWalletName,
} from "@solana-mobile/wallet-adapter-mobile";
import type {
  ComponentProps,
  Dispatch,
  ReactNode,
  SetStateAction,
} from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { mutate } from "swr";
import { z } from "zod";

import {
  deserializePublicKeyList,
  deserializePublicKeyMap,
} from "../deserialize-public-key.js";
import { SessionContext as SessionReactContext } from "../hooks/use-session.js";
import { getCacheKey } from "../hooks/use-token-account-data.js";
import type { EstablishedOptions, StateType } from "../session-state.js";
import { SessionState } from "../session-state.js";
import type { SolanaMobileWallet, SolanaWallet } from "../solana-wallet.js";
import { signWithWallet } from "../solana-wallet.js";
import { errorToString } from "./component-library/error-to-string/index.js";
import { ToastProvider, useToast } from "./component-library/Toast/index.js";
import { RenewSessionModal } from "./renew-session-modal.js";
import { SignInModal } from "./sign-in-modal.js";

const ONE_SECOND_IN_MS = 1000;
const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;
const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS;
const ONE_DAY_IN_MS = 24 * ONE_HOUR_IN_MS;
const DEFAULT_SESSION_DURATION = 7 * ONE_DAY_IN_MS;

const WALLET_READY_TIMEOUT = 3 * ONE_SECOND_IN_MS;

const ERROR_CODE_SESSION_EXPIRED = 4_000_000_000;
const ERROR_CODE_SESSION_LIMITS_EXCEEDED = 4_000_000_008;

type Props = ConstrainedOmit<
  ComponentProps<typeof SessionProvider>,
  "tokens" | "defaultRequestedLimits" | "wallets"
> & {
  tokens?: (PublicKey | string)[] | undefined;
  defaultRequestedLimits?:
    | Map<PublicKey, bigint>
    | Record<string, bigint>
    | undefined;
  wallets?: (MessageSignerWalletAdapterProps & BaseWalletAdapter)[] | undefined;
  termsOfServiceUrl?: string | undefined;
  privacyPolicyUrl?: string | undefined;
};

const filterUnwantedWallets = (wallets: SolanaWallet[]) => {
  let seenMetaMask = false;
  return wallets.filter((wallet) => {
    /*
     * Currently excludes the legacy Solflare MetaMask Snap adapter. The Snap was
     * decommissioned after MetaMask added native Solana; keeping it around causes
     * a confusing dead-end modal for most users.
     *
     * WARNING: We detect this via the logic that Solflare checks for the Snap adapter
     * *after* Metamask has already been registered as a wallet.
     * https://github.com/anza-xyz/wallet-adapter/blob/master/packages/wallets/solflare/src/metamask/detect.ts#L13
     */
    if (wallet.name === "MetaMask") {
      // If we've already kept one MetaMask, drop any subsequent ones.
      if (seenMetaMask) return false;
      seenMetaMask = true;
    }
    return true;
  });
};

export const FogoSessionProvider = ({
  tokens,
  defaultRequestedLimits,
  children,
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
  const walletsWithStandardAdapters = useStandardWalletAdapters(
    // biome-ignore lint/suspicious/noExplicitAny: We have to typecast this unfortunately because the Solana library typings are broken
    wallets as any,
  ) as unknown as SolanaWallet[];
  const filteredWalletsWithStandardAdapters = useMemo(
    () => filterUnwantedWallets(walletsWithStandardAdapters),
    [walletsWithStandardAdapters],
  );
  const mobileWalletAdapter = useMemo(
    () =>
      isMobile(filteredWalletsWithStandardAdapters)
        ? (filteredWalletsWithStandardAdapters.find(
            (adapter) => adapter.name === SolanaMobileWalletAdapterWalletName,
          ) ??
          (new SolanaMobileWalletAdapter({
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
            // doing type casting to use our type with the EventEmitter types
          }) as SolanaMobileWallet))
        : undefined,
    [filteredWalletsWithStandardAdapters],
  );

  const walletsWithMobileAdapter = useMemo(
    () =>
      mobileWalletAdapter == undefined
        ? filteredWalletsWithStandardAdapters
        : [mobileWalletAdapter, ...filteredWalletsWithStandardAdapters],
    [filteredWalletsWithStandardAdapters, mobileWalletAdapter],
  );

  return (
    <ToastProvider>
      <SessionProvider
        defaultRequestedLimits={
          defaultRequestedLimits === undefined
            ? undefined
            : deserializePublicKeyMap(defaultRequestedLimits)
        }
        tokens={tokens ? deserializePublicKeyList(tokens) : undefined}
        wallets={walletsWithMobileAdapter}
        {...props}
      >
        {children}
        <SignInModal
          privacyPolicyUrl={privacyPolicyUrl}
          termsOfServiceUrl={termsOfServiceUrl}
          wallets={walletsWithMobileAdapter}
        />
        <RenewSessionModal />
      </SessionProvider>
    </ToastProvider>
  );
};

// Taken from https://github.com/anza-xyz/wallet-adapter/blob/master/packages/core/react/src/getEnvironment.ts
const ANDROID_REGEX = /android/i;
const WEBVIEW_REGEX =
  /(WebView|Version\/.+(Chrome)\/(\d+)\.(\d+)\.(\d+)\.(\d+)|; wv\).+(Chrome)\/(\d+)\.(\d+)\.(\d+)\.(\d+))/i;
const isMobile = (wallets: SolanaWallet[]) => {
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
  defaultAddressLookupTableAddress,
  domain,
  network,
  rpc,
  paymaster,
  sendToPaymaster,
  sponsor,
  ...args
}: Parameters<typeof createSessionConnection>[0] &
  Omit<Parameters<typeof createSessionContext>[0], "connection"> &
  Omit<
    Parameters<typeof useSessionState>[0],
    "getSessionContext" | "setShowBridgeIn"
  > & {
    children: ReactNode;
    defaultRequestedLimits?: Map<PublicKey, bigint> | undefined;
    enableUnlimited?: boolean | undefined;
    onStartSessionInit?:
      | (() => Promise<boolean> | boolean)
      | (() => Promise<void> | void)
      | undefined;
  }) => {
  const [showBridgeIn, setShowBridgeIn] = useState(false);
  const sessionConnection = useMemo(
    () =>
      // @ts-expect-error `createSessionConnection` enforces certain
      // relationships between the arguments.  We have to destructure the
      // arguments from the props to `SessionProvider` or else react would
      // re-initialize this memoized value on each render, however doing that
      // removes typescript's knowledge of these relationships.  We know the
      // relationships are true because the prop types of `SessionProvider`
      // extend the parameters of `createSessionConnection` so here it's safe to
      // override typescript.
      createSessionConnection({
        network,
        paymaster,
        rpc,
        sendToPaymaster,
        sponsor,
      }),
    [network, rpc, paymaster, sendToPaymaster, sponsor],
  );

  const getSessionContext = useMemo(() => {
    let sessionContext: SessionContext | undefined;
    return async () => {
      sessionContext ??= await createSessionContext({
        connection: sessionConnection,
        defaultAddressLookupTableAddress,
        domain,
      });
      return sessionContext;
    };
  }, [sessionConnection, defaultAddressLookupTableAddress, domain]);

  const sessionState = useSessionState({
    ...args,
    enableUnlimited,
    getSessionContext,
    network,
    setShowBridgeIn: setShowBridgeIn,
  });

  const state = useMemo(
    () => ({
      connection: sessionConnection.connection,
      defaultRequestedLimits,
      enableUnlimited: enableUnlimited ?? false,
      getSessionContext,
      network,
      onStartSessionInit,
      rpc: sessionConnection.rpc,
      sessionState,
      setShowBridgeIn,
      showBridgeIn,
      whitelistedTokens: args.tokens ?? [],
    }),
    [
      network,
      sessionConnection,
      getSessionContext,
      sessionState,
      enableUnlimited,
      args.tokens,
      onStartSessionInit,
      defaultRequestedLimits,
      showBridgeIn,
    ],
  );

  return <SessionReactContext value={state}>{children}</SessionReactContext>;
};

const useSessionState = ({
  network,
  tokens,
  enableUnlimited,
  getSessionContext,
  onOpenExtendSessionExpiry,
  onOpenSessionLimitsReached,
  wallets,
  sessionEstablishmentLookupTable,
  setShowBridgeIn,
}: {
  network: Network;
  getSessionContext: () => Promise<SessionExecutionContext>;
  tokens?: PublicKey[] | undefined;
  enableUnlimited?: boolean | undefined;
  onOpenExtendSessionExpiry?: (() => void) | undefined;
  onOpenSessionLimitsReached?: (() => void) | undefined;
  setShowBridgeIn: Dispatch<SetStateAction<boolean>>;
  wallets: SolanaWallet[];
  sessionEstablishmentLookupTable?: string | undefined;
}) => {
  const [state, setState] = useState<SessionState>(SessionState.Initializing());
  const toast = useToast();
  const walletName = useLocalStorageValue<string>("walletName");

  const sendTransaction = useCallback(
    async (
      session: Session,
      establishedOptions: EstablishedOptions,
      instructions: TransactionOrInstructions,
      options?: SendTransactionOptions,
    ) => {
      const result = await session.sendTransaction(instructions, options);
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
          await mutate(getCacheKey(network, session.walletPublicKey));
        } catch (error: unknown) {
          toast.error(
            "We couldn't update your token balances, please try refreshing the page",
            errorToString(error),
          );
          // biome-ignore lint/suspicious/noConsole: we want to log the error
          console.error("Failed to update token account data", error);
        }
      }
      return result;
    },
    [onOpenExtendSessionExpiry, onOpenSessionLimitsReached, toast, network],
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
      const { updateSession, ...updatingOptions } = establishedOptions;
      setState(
        SessionState.UpdatingSession({ ...updatingOptions, previousState }),
      );
      getSessionContext()
        .then((context) =>
          replaceSession({
            context,
            expires: new Date(Date.now() + duration),
            session,
            signMessage: (message) =>
              signWithWallet(establishedOptions.solanaWallet, message),
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
    (session: Session, wallet: SolanaWallet) => {
      setStoredSession(network, {
        sessionKey: session.sessionKey,
        walletPublicKey: session.walletPublicKey,
      }).catch((error: unknown) => {
        // biome-ignore lint/suspicious/noConsole: we want to log the error
        console.error("Failed to persist session", error);
      });
      const establishedOptions: EstablishedOptions = {
        createLogInToken: () => createLogInToken(session),
        endSession: () => {
          disconnect(wallet, network, {
            session,
            sessionContext: getSessionContext(),
          });
        },
        expiration: session.sessionInfo.expiration,
        getSessionUnwrapInstructions: () =>
          session.getSessionUnwrapInstructions(),
        getSessionWrapInstructions: (amount: bigint) =>
          session.getSessionWrapInstructions(amount),
        getSystemProgramSessionWrapInstruction: (amount: bigint) =>
          session.getSystemProgramSessionWrapInstruction(amount),
        isLimited:
          session.sessionInfo.authorizedTokens === AuthorizedTokens.Specific,
        payer: session.payer,
        requestExtendedExpiry: (onCancel?: () => void) => {
          setState(
            SessionState.RequestingExtendedExpiry({
              ...establishedOptions,
              cancel: () => {
                setState(SessionState.Established(establishedOptions));
                onCancel?.();
              },
            }),
          );
        },
        sendTransaction: (instructions, options) =>
          sendTransaction(session, establishedOptions, instructions, options),
        sessionKey: session.sessionKey,
        sessionPublicKey: session.sessionPublicKey,
        showBridgeIn: () => {
          setShowBridgeIn(true);
        },
        solanaWallet: wallet,
        updateSession: (previousState, duration, limits) => {
          updateSession({
            duration,
            establishedOptions,
            limits,
            onSuccess: (newSession) => {
              completeSessionSetup(newSession, wallet);
            },
            previousState,
            session,
          });
        },
        walletPublicKey: session.walletPublicKey,
      };

      setState(SessionState.Established(establishedOptions));
    },
    [
      getSessionContext,
      sendTransaction,
      setShowBridgeIn,
      updateSession,
      network,
    ],
  );

  const submitLimits = useCallback(
    ({
      wallet,
      walletPublicKey,
      sessionDuration,
      limits,
      onError,
    }: {
      wallet: SolanaWallet;
      walletPublicKey: PublicKey;
      sessionDuration: number;
      limits?: Map<PublicKey, bigint> | undefined;
      onError: () => void;
    }) => {
      const controller = new AbortController();
      setState(
        SessionState.SettingLimits({
          cancel: () => {
            controller.abort();
            disconnect(wallet, network);
          },
          walletPublicKey,
        }),
      );
      establishSession(
        getSessionContext(),
        wallet,
        walletPublicKey,
        sessionDuration,
        limits,
        controller.signal,
        sessionEstablishmentLookupTable,
      )
        .then((session) => {
          if (session !== undefined) {
            completeSessionSetup(session, wallet);
          }
        })
        .catch((error: unknown) => {
          // biome-ignore lint/suspicious/noConsole: we want to log the error
          console.error("Failed to establish session", error);
          toast.error(
            "Failed to establish session, please try again",
            errorToString(error),
          );
          onError();
        });
    },
    [
      getSessionContext,
      completeSessionSetup,
      toast,
      sessionEstablishmentLookupTable,
      network,
    ],
  );

  const requestLimits = useCallback(
    (
      wallet: SolanaWallet,
      walletPublicKey: PublicKey,
      requestedLimits: Map<PublicKey, bigint> | undefined,
    ) => {
      setState(
        SessionState.RequestingLimits({
          cancel: () => disconnect(wallet, network),
          requestedLimits,
          submitLimits: (sessionDuration, limits) => {
            submitLimits({
              limits,
              onError: () => {
                requestLimits(wallet, walletPublicKey, requestedLimits);
              },
              sessionDuration,
              wallet,
              walletPublicKey,
            });
          },
          walletPublicKey,
        }),
      );
    },
    [submitLimits, network],
  );

  const setupWalletEvents = useCallback(
    ({
      wallet,
      requestedLimits,
      onDisconnect,
      onError,
    }: {
      wallet: SolanaWallet;
      requestedLimits?: Map<PublicKey, bigint> | undefined;
      onDisconnect: () => void;
      onError: () => void;
    }) => {
      const onWalletConnected = (walletPublicKey: PublicKey) => {
        setState(SessionState.CheckingStoredSession());
        checkStoredSession(network, getSessionContext(), walletPublicKey)
          .then((result) => {
            if (result === undefined) {
              walletName.set(wallet.name);
              if (
                (tokens === undefined || tokens.length === 0) &&
                !enableUnlimited
              ) {
                submitLimits({
                  limits: new Map(),
                  onError,
                  sessionDuration: DEFAULT_SESSION_DURATION,
                  wallet,
                  walletPublicKey,
                });
              } else {
                requestLimits(wallet, walletPublicKey, requestedLimits);
              }
            } else {
              walletName.set(wallet.name);
              completeSessionSetup(result, wallet);
            }
          })
          .catch((error: unknown) => {
            // biome-ignore lint/suspicious/noConsole: we want to log the error
            console.error("Failed to restore stored session", error);
            onError();
          });
      };

      const onWalletDisconnected = () => {
        const address = wallet.publicKey?.toBase58();
        if (address === undefined) {
          wallet.off("connect", onWalletConnected);
          wallet.off("disconnect", onWalletDisconnected);
          onDisconnect();
        }
      };

      wallet.on("connect", onWalletConnected);
      wallet.on("disconnect", onWalletDisconnected);
    },
    [
      completeSessionSetup,
      getSessionContext,
      tokens,
      walletName.set,
      submitLimits,
      tokens?.length,
      requestLimits,
      enableUnlimited,
      network,
      walletName,
    ],
  );

  const connectWallet = useCallback(
    (args: {
      wallet: SolanaWallet;
      requestedLimits?: Map<PublicKey, bigint> | undefined;
      onDisconnect: () => void;
      onError: () => void;
    }) => {
      setupWalletEvents(args);

      const controller = new AbortController();
      setState(
        SessionState.WalletConnecting({
          cancel: () => {
            controller.abort();
            args.onDisconnect();
          },
        }),
      );

      connectWalletImpl(args.wallet, controller.signal).catch(
        (error: unknown) => {
          toast.error("Failed to connect wallet", errorToString(error));
          args.onError();
        },
      );
    },
    [toast, setupWalletEvents],
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
              onDisconnect: cancel,
              onError: () => {
                requestWallet(requestedLimits);
              },
              requestedLimits,
              wallet,
            });
          },
        }),
      );
    },
    [connectWallet],
  );

  // biome-ignore lint/correctness/useExhaustiveDependencies: We very explicitly only want this effect to fire at startup or when the network changes and never in other cases
  useEffect(() => {
    if (walletName.value === undefined) {
      setState(SessionState.NotEstablished(requestWallet));
    } else {
      const wallet = wallets.find((wallet) => wallet.name === walletName.value);
      if (wallet === undefined) {
        setState(SessionState.NotEstablished(requestWallet));
      } else {
        setupWalletEvents({
          onDisconnect: () =>
            setState(SessionState.NotEstablished(requestWallet)),
          onError: () => requestWallet(),
          wallet,
        });
        setState(SessionState.CheckingStoredSession());
        autoConnectWallet(
          wallet,
          AbortSignal.timeout(WALLET_READY_TIMEOUT),
        ).catch((error: unknown) => {
          // biome-ignore lint/suspicious/noConsole: we want to log the error
          console.error("Failed to autoconnect wallet", error);
          setState(SessionState.NotEstablished(requestWallet));
        });
      }
    }
  }, [network]);

  return state;
};

/**
 * Waits for the wallet to be ready before trying autoConnect. This is especially needed for Nightly Wallet as it's not instantly ready.
 */
const waitForWalletReady = async (
  wallet: SolanaWallet,
  signal: AbortSignal,
): Promise<void> => {
  if (wallet.readyState === WalletReadyState.Installed) {
    return;
  } else if (signal.aborted) {
    throw new DOMException("Aborted", "AbortError");
  } else {
    return await new Promise<void>((resolve, reject) => {
      const onReadyStateChange = (readyState: WalletReadyState) => {
        if (readyState === WalletReadyState.Installed) {
          wallet.off("readyStateChange", onReadyStateChange);
          signal.removeEventListener("abort", abortHandler);
          resolve();
        }
      };
      const abortHandler = () => {
        wallet.off("readyStateChange", onReadyStateChange);
        reject(new DOMException("Aborted", "AbortError"));
      };
      wallet.on("readyStateChange", onReadyStateChange);
      signal.addEventListener("abort", abortHandler, { once: true });
    });
  }
};

const autoConnectWallet = async (
  wallet: SolanaWallet,
  abortSignal: AbortSignal,
) => {
  await waitForWalletReady(wallet, abortSignal);
  await wallet.autoConnect();
  if (abortSignal.aborted || !wallet.connected) {
    await wallet.disconnect();
    return;
  } else {
    return ensureWalletPublicKey(wallet);
  }
};

const connectWalletImpl = async (
  wallet: SolanaWallet,
  abortSignal: AbortSignal,
) => {
  await wallet.connect();
  if (abortSignal.aborted || !wallet.connected) {
    await wallet.disconnect();
    return;
  } else {
    return ensureWalletPublicKey(wallet);
  }
};

const checkStoredSession = async (
  network: Network,
  sessionContext: Promise<SessionExecutionContext>,
  walletPublicKey: PublicKey,
) => {
  const storedSession = await getStoredSession(network, walletPublicKey);
  if (storedSession === undefined) {
    return;
  } else {
    const session = await reestablishSession(
      await sessionContext,
      storedSession.walletPublicKey,
      storedSession.sessionKey,
    );
    if (session === undefined) {
      await clearStoredSession(network, walletPublicKey);
      return;
    } else {
      return session;
    }
  }
};

const establishSession = async (
  sessionContext: Promise<SessionExecutionContext>,
  wallet: SolanaWallet,
  walletPublicKey: PublicKey,
  sessionDuration: number,
  limits: Map<PublicKey, bigint> | undefined,
  abortSignal: AbortSignal,
  sessionEstablishmentLookupTable?: string,
) => {
  const context = await sessionContext;
  const result = await establishSessionImpl({
    context,
    expires: new Date(Date.now() + sessionDuration),
    sessionEstablishmentLookupTable,
    signMessage: (message) => signWithWallet(wallet, message),
    walletPublicKey: walletPublicKey,
    ...(limits === undefined ? { unlimited: true } : { limits }),
  });
  switch (result.type) {
    case SessionResultType.Success: {
      if (abortSignal.aborted) {
        // Use promise `.catch` here so that we don't block
        revokeSession({ context, session: result.session }).catch(
          (error: unknown) => {
            // biome-ignore lint/suspicious/noConsole: we want to log the error
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
  wallet: SolanaWallet,
  network: Network,
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
          clearStoredSession(network, sessionInfo.session.walletPublicKey),
        ]),
  ])
    .then(() => {
      localStorage.removeItem("walletName");
    })
    .catch((error: unknown) => {
      // biome-ignore lint/suspicious/noConsole: we want to log the error
      console.error("Failed to clean up session", error);
    });
};

const ensureWalletPublicKey = (wallet: SolanaWallet) => {
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

type ConstrainedOmit<T, K> = {
  // biome-ignore lint/suspicious/noExplicitAny: todo add explanation
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
