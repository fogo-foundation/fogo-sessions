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
import { PublicKey } from "@solana/web3.js";
import {
  createDefaultAddressSelector,
  createDefaultAuthorizationResultCache,
  createDefaultWalletNotFoundHandler,
  SolanaMobileWalletAdapter,
  SolanaMobileWalletAdapterWalletName,
} from "@solana-mobile/wallet-adapter-mobile";
import clsx from "clsx";
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
import { errorToString } from "../error-to-string.js";
import { SessionContext as SessionReactContext } from "../hooks/use-session.js";
import { getCacheKey } from "../hooks/use-token-account-data.js";
import layerStyles from "../layer.module.css";
import resetStyles from "../reset.module.css";
import type { EstablishedOptions, StateType } from "../session-state.js";
import { SessionState } from "../session-state.js";
import type { SolanaMobileWallet, SolanaWallet } from "../solana-wallet.js";
import { signWithWallet } from "../solana-wallet.js";
import { ToastProvider, useToast } from "./component-library/Toast/index.js";
import { RenewSessionModal } from "./renew-session-modal.js";
import { SignInModal } from "./sign-in-modal.js";

const ONE_SECOND_IN_MS = 1000;
const ONE_MINUTE_IN_MS = 60 * ONE_SECOND_IN_MS;
const ONE_HOUR_IN_MS = 60 * ONE_MINUTE_IN_MS;
const ONE_DAY_IN_MS = 24 * ONE_HOUR_IN_MS;
const DEFAULT_SESSION_DURATION = 7 * ONE_DAY_IN_MS;

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
  // We have to typecast this unfortunately because the Solana library typings are broken
  const walletsWithStandardAdapters = useStandardWalletAdapters(
    // biome-ignore lint/suspicious/noExplicitAny: reason
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
    <ToastProvider
      toastRegionClassName={clsx(resetStyles.reset, layerStyles.layerToast)}
    >
      <SessionProvider
        tokens={tokens ? deserializePublicKeyList(tokens) : undefined}
        defaultRequestedLimits={
          defaultRequestedLimits === undefined
            ? undefined
            : deserializePublicKeyMap(defaultRequestedLimits)
        }
        wallets={walletsWithMobileAdapter}
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
        rpc,
        paymaster,
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
    setShowBridgeIn: setShowBridgeIn,
    network,
  });

  const state = useMemo(
    () => ({
      network,
      connection: sessionConnection.connection,
      rpc: sessionConnection.rpc,
      getSessionContext,
      sessionState,
      enableUnlimited: enableUnlimited ?? false,
      whitelistedTokens: args.tokens ?? [],
      onStartSessionInit,
      defaultRequestedLimits,
      showBridgeIn,
      setShowBridgeIn,
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
      setShowBridgeIn,
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
          // biome-ignore lint/suspicious/noConsole: reason
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
            signMessage: (message) =>
              signWithWallet(establishedOptions.solanaWallet, message),
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
    (session: Session, wallet: SolanaWallet, onEndSession: () => void) => {
      setStoredSession(network, {
        sessionKey: session.sessionKey,
        walletPublicKey: session.walletPublicKey,
      }).catch((error: unknown) => {
        // biome-ignore lint/suspicious/noConsole: reason
        console.error("Failed to persist session", error);
      });
      const establishedOptions: EstablishedOptions = {
        endSession: () => {
          disconnect(wallet, network, {
            session,
            sessionContext: getSessionContext(),
          });
          onEndSession();
        },
        payer: session.payer,
        sendTransaction: (instructions, options) =>
          sendTransaction(session, establishedOptions, instructions, options),
        sessionKey: session.sessionKey,
        isLimited:
          session.sessionInfo.authorizedTokens === AuthorizedTokens.Specific,
        walletPublicKey: session.walletPublicKey,
        solanaWallet: wallet,
        sessionPublicKey: session.sessionPublicKey,
        createLogInToken: () => createLogInToken(session),
        showBridgeIn: () => {
          setShowBridgeIn(true);
        },
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

      // when the wallet is disconnected, we need to end the session
      const handleEndSession = () => {
        const address = wallet.publicKey?.toBase58();
        if (address === undefined) {
          onEndSession();
        }
        wallet.off("disconnect", handleEndSession);
      };

      const currentAddress = wallet.publicKey?.toBase58();

      const handleSwitchWallet = (key: PublicKey) => {
        const newAddress = key.toBase58();
        if (newAddress !== currentAddress) {
          connectWallet({
            wallet,
            requestedLimits: undefined,
            onCancel: () => {
              wallet.off("connect", handleSwitchWallet);
            },
            onError: () => {
              wallet.off("connect", handleSwitchWallet);
            },
            skipConnectingState: true,
          });
          wallet.off("connect", handleSwitchWallet);
        }
      };
      wallet.on("disconnect", handleEndSession);
      // generally wallets will emit a "connect" event when the wallet has changed the connected address
      // ("accountChanged" should be emitted but none of the wallets we use emit it)
      wallet.on("connect", handleSwitchWallet);
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
      onCancel,
      onError,
    }: {
      wallet: SolanaWallet;
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
            disconnect(wallet, network);
            onCancel();
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
            completeSessionSetup(session, wallet, onCancel);
          }
        })
        .catch((error: unknown) => {
          // biome-ignore lint/suspicious/noConsole: reason
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
      onCancel: () => void,
    ) => {
      setState(
        SessionState.RequestingLimits({
          requestedLimits,
          cancel: () => {
            disconnect(wallet, network);
            onCancel();
          },
          walletPublicKey,
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
    [submitLimits, network],
  );

  const connectWallet = useCallback(
    ({
      wallet,
      requestedLimits,
      onCancel,
      onError,
      skipConnectingState = false,
    }: {
      wallet: SolanaWallet;
      requestedLimits?: Map<PublicKey, bigint> | undefined;
      onCancel: () => void;
      onError: () => void;
      skipConnectingState?: boolean;
    }) => {
      const controller = new AbortController();
      if (!skipConnectingState) {
        setState(
          SessionState.WalletConnecting({
            cancel: () => {
              controller.abort();
              onCancel();
            },
          }),
        );
      }
      connectWalletImpl(network, getSessionContext(), wallet, controller.signal)
        .then((result) => {
          switch (result.type) {
            case ConnectWalletStateType.RestoredSession: {
              walletName.set(wallet.name);
              completeSessionSetup(result.session, wallet, onCancel);
              return;
            }
            case ConnectWalletStateType.Connected: {
              walletName.set(wallet.name);
              if (
                (tokens === undefined || tokens.length === 0) &&
                !enableUnlimited
              ) {
                submitLimits({
                  sessionDuration: DEFAULT_SESSION_DURATION,
                  wallet,
                  walletPublicKey: result.walletPublicKey,
                  onError,
                  onCancel,
                  limits: new Map(),
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
      walletName,
      completeSessionSetup,
      tokens,
      enableUnlimited,
      submitLimits,
      requestLimits,
      toast,
      network,
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

  useEffect(() => {
    if (walletName.value === undefined) {
      setState(SessionState.NotEstablished(requestWallet));
    } else {
      const wallet = wallets.find((wallet) => wallet.name === walletName.value);
      if (wallet === undefined) {
        setState(SessionState.NotEstablished(requestWallet));
      } else {
        setState(SessionState.CheckingStoredSession());
        checkStoredSession(network, getSessionContext(), wallet)
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
            // biome-ignore lint/suspicious/noConsole: reason
            console.error("Failed to restore stored session", error);
            setState(SessionState.NotEstablished(requestWallet));
          });
      }
    }
    // We very explicitly only want this effect to fire at startup or when the
    // network changes and never in other cases
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [network]);

  return state;
};

/**
 * Waits for the wallet to be ready before trying autoConnect. This is especially needed for Nightly Wallet as it's not instantly ready.
 */
const waitForWalletReady = (wallet: SolanaWallet) => {
  const WALLET_READY_TIMEOUT = 3000;
  const isWalletInReadyState = wallet.readyState === WalletReadyState.Installed;

  if (isWalletInReadyState) {
    return true;
  }

  // If the wallet is not in the ready state, we wait for it to be ready
  // or for the timeout to expire so that the user can try to connect again (should never happen)
  return Promise.race([
    new Promise((resolve) => {
      wallet.on("readyStateChange", (readyState) => {
        if (readyState === WalletReadyState.Installed) {
          resolve(true);
        }
      });
    }),
    new Promise((resolve) => {
      setTimeout(() => {
        resolve(false);
      }, WALLET_READY_TIMEOUT);
    }),
  ]);
};

const checkStoredSession = async (
  network: Network,
  sessionContext: Promise<SessionExecutionContext>,
  wallet: SolanaWallet,
) => {
  await waitForWalletReady(wallet);
  await wallet.autoConnect();
  if (wallet.publicKey === null) {
    return;
  } else {
    const result = await tryLoadStoredSession(
      network,
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
  network: Network,
  sessionContext: Promise<SessionExecutionContext>,
  wallet: SolanaWallet,
  abortSignal: AbortSignal,
) => {
  await wallet.connect();
  if (abortSignal.aborted || !wallet.connected) {
    await wallet.disconnect();
    return ConnectWalletState.Aborted();
  } else {
    const walletPublicKey = ensureWalletPublicKey(wallet);
    return tryLoadStoredSession(
      network,
      sessionContext,
      wallet,
      walletPublicKey,
      abortSignal,
    );
  }
};

const tryLoadStoredSession = async (
  network: Network,
  sessionContext: Promise<SessionExecutionContext>,
  wallet: SolanaWallet,
  walletPublicKey: PublicKey,
  abortSignal?: AbortSignal,
) => {
  const storedSession = await getStoredSession(network, walletPublicKey);
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
      await clearStoredSession(network, walletPublicKey);
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
  wallet: SolanaWallet,
  walletPublicKey: PublicKey,
  sessionDuration: number,
  limits: Map<PublicKey, bigint> | undefined,
  abortSignal: AbortSignal,
  sessionEstablishmentLookupTable?: string,
) => {
  const context = await sessionContext;
  const result = await establishSessionImpl({
    expires: new Date(Date.now() + sessionDuration),
    context,
    signMessage: (message) => signWithWallet(wallet, message),
    walletPublicKey: walletPublicKey,
    sessionEstablishmentLookupTable,
    ...(limits === undefined ? { unlimited: true } : { limits }),
  });
  switch (result.type) {
    case SessionResultType.Success: {
      if (abortSignal.aborted) {
        // Use promise `.catch` here so that we don't block
        revokeSession({ context, session: result.session }).catch(
          (error: unknown) => {
            // biome-ignore lint/suspicious/noConsole: reason
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
      // biome-ignore lint/suspicious/noConsole: reason
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
  // biome-ignore lint/suspicious/noExplicitAny: reason
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
