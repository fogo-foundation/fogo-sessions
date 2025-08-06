"use client";

import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { CoinsIcon } from "@phosphor-icons/react/dist/ssr/Coins";
import { CopyIcon } from "@phosphor-icons/react/dist/ssr/Copy";
import { PublicKey } from "@solana/web3.js";
import type { ComponentProps } from "react";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import {
  Button,
  Link,
  Dialog,
  OverlayArrow,
  Popover,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Heading,
} from "react-aria-components";
import { mutate } from "swr";

import { amountToString } from "./amount-to-string.js";
import { deserializePublicKeyMap } from "./deserialize-public-key.js";
import { errorToString } from "./error-to-string.js";
import { FogoWordmark } from "./fogo-wordmark.js";
import styles from "./session-button.module.css";
import { SessionLimits } from "./session-limits.js";
import type {
  EstablishedSessionState,
  SessionState,
} from "./session-provider.js";
import {
  StateType as SessionStateType,
  useSession,
  useSessionContext,
  isEstablished,
} from "./session-provider.js";
import {
  getCacheKey,
  StateType as TokenDataStateType,
  useTokenAccountData,
} from "./use-token-account-data.js";

const FAUCET_URL = "https://gas.zip/faucet/fogo";

export const SessionButton = ({
  requestedLimits,
}: {
  requestedLimits?: Map<PublicKey, bigint> | Record<string, bigint> | undefined;
}) => {
  const { whitelistedTokens, onStartSessionInit } = useSessionContext();
  const sessionState = useSession();
  const prevSessionState = useRef(sessionState);
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const limits = useMemo(
    () =>
      requestedLimits === undefined
        ? undefined
        : deserializePublicKeyMap(requestedLimits),
    [requestedLimits],
  );
  const handlePress = useCallback(() => {
    if (isEstablished(sessionState)) {
      setSessionPanelOpen(true);
    } else if (sessionState.type === SessionStateType.NotEstablished) {
      if (onStartSessionInit === undefined) {
        sessionState.establishSession(limits);
      } else {
        const callbackReturn = onStartSessionInit();
        if (callbackReturn instanceof Promise) {
          callbackReturn
            .then((shouldStartSession) => {
              if (shouldStartSession !== false) {
                sessionState.establishSession(limits);
              }
            })
            .catch((error: unknown) => {
              // eslint-disable-next-line no-console
              console.error("Error in `onStartSessionInit` callback", error);
            });
        } else if (callbackReturn !== false) {
          sessionState.establishSession(limits);
        }
      }
    }
  }, [sessionState, limits, onStartSessionInit]);
  const handleSessionPanelOpenChange = useCallback(
    (isOpen: boolean) => {
      if (!isOpen) {
        setSessionPanelOpen(false);
      }
    },
    [setSessionPanelOpen],
  );
  const closeSessionPanel = useCallback(() => {
    setSessionPanelOpen(false);
  }, [setSessionPanelOpen]);
  const isLoading = [
    SessionStateType.Initializing,
    SessionStateType.CheckingStoredSession,
    SessionStateType.RequestingLimits,
    SessionStateType.SettingLimits,
    SessionStateType.WalletConnecting,
    SessionStateType.SelectingWallet,
  ].includes(sessionState.type);

  useEffect(() => {
    if (sessionState.type !== prevSessionState.current.type) {
      if (
        isEstablished(sessionState) &&
        !isEstablished(prevSessionState.current) &&
        prevSessionState.current.type !== SessionStateType.CheckingStoredSession
      ) {
        setSessionPanelOpen(true);
      }
      prevSessionState.current = sessionState;
    }
  }, [sessionState]);

  return (
    <>
      <Button
        ref={triggerRef}
        className={styles.sessionButton ?? ""}
        isDisabled={isLoading}
        isPending={isLoading}
        onPress={handlePress}
        data-session-panel-open={sessionPanelOpen ? "" : undefined}
      >
        {isEstablished(sessionState) ? (
          <>
            <TruncateKey keyValue={sessionState.walletPublicKey} />
            <svg
              width={8}
              height={8}
              viewBox="0 0 12 6"
              className={styles.chevron}
              fill="currentColor"
              stroke="currentColor"
            >
              <path d="M0 0 L6 6 L12 0" />
            </svg>
          </>
        ) : (
          <>
            Log in with <FogoWordmark className={styles.fogoWordmark} />
          </>
        )}
      </Button>
      <Popover
        className={styles.sessionPanelPopover ?? ""}
        offset={1}
        isOpen={sessionPanelOpen && isEstablished(sessionState)}
        triggerRef={triggerRef}
        onOpenChange={handleSessionPanelOpenChange}
      >
        <OverlayArrow>
          <svg
            width={12}
            height={12}
            viewBox="0 0 12 12"
            className={styles.overlayArrow}
          >
            <path d="M0 0 L6 6 L12 0" />
          </svg>
        </OverlayArrow>
        <Dialog className={styles.sessionPanel ?? ""}>
          <Heading slot="title" className={styles.heading}>
            <span>Your Wallet</span>
            <span>·</span>
            {isEstablished(sessionState) && (
              <CopyWalletAddressButton
                walletAddress={sessionState.walletPublicKey}
              />
            )}
          </Heading>
          {whitelistedTokens.length === 0 ? (
            <div className={styles.tokensPanel}>
              <Tokens sessionState={sessionState} />
            </div>
          ) : (
            <Tabs className={styles.tabs ?? ""}>
              <TabList aria-label="Wallet" className={styles.tabList ?? ""}>
                <Tab className={styles.tab ?? ""} id="tokens">
                  Tokens
                </Tab>
                <Tab className={styles.tab ?? ""} id="session-limits">
                  Session
                </Tab>
              </TabList>
              <TabPanel className={styles.tokensPanel ?? ""} id="tokens">
                <Tokens sessionState={sessionState} />
              </TabPanel>
              <TabPanel
                className={styles.limitsPanel ?? ""}
                id="session-limits"
              >
                {isEstablished(sessionState) && (
                  <SessionLimitsPanel sessionState={sessionState} />
                )}
              </TabPanel>
            </Tabs>
          )}
          <div className={styles.footer}>
            <FogoWordmark className={styles.fogoWordmark} />
            <LogoutButton
              sessionState={sessionState}
              onLogout={closeSessionPanel}
            />
          </div>
        </Dialog>
      </Popover>
    </>
  );
};

const CopyWalletAddressButton = ({
  walletAddress,
}: {
  walletAddress: PublicKey;
}) => {
  const [isCopied, setIsCopied] = useState(false);
  const walletAddressAsString = useMemo(
    () => walletAddress.toBase58(),
    [walletAddress],
  );

  const copyAddress = useCallback(() => {
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    navigator.clipboard
      .writeText(walletAddressAsString)
      .then(() => {
        setIsCopied(true);
        setTimeout(() => {
          setIsCopied(false);
        }, 1000);
      })
      .catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error(error);
      });
  }, [walletAddressAsString]);

  return (
    <Button
      className={styles.copyWalletAddressButton ?? ""}
      onPress={copyAddress}
      isDisabled={isCopied}
      data-is-copied={isCopied ? "" : undefined}
    >
      <code>
        <TruncateKey keyValue={walletAddress} />
      </code>
      <div className={styles.iconContainer}>
        <CopyIcon className={styles.copyIcon} />
        <CheckIcon className={styles.checkIcon} />
      </div>
    </Button>
  );
};

const FaucetButton = ({
  sessionState,
  ...props
}: { sessionState: EstablishedSessionState } & Omit<
  ComponentProps<typeof Link>,
  "onPress"
>) => {
  const faucetUrl = useMemo(() => {
    const url = new URL(FAUCET_URL);
    url.searchParams.set("address", sessionState.walletPublicKey.toBase58());
    return url;
  }, [sessionState]);

  const showFaucet = useCallback(() => {
    const windowRef = window.open(
      faucetUrl,
      "Fogo Faucet",
      "height=800,width=700",
    );
    if (windowRef !== null) {
      const interval = setInterval(() => {
        if (windowRef.closed) {
          clearInterval(interval);
          mutate(getCacheKey(sessionState.walletPublicKey)).catch(
            (error: unknown) => {
              // eslint-disable-next-line no-console
              console.error("Failed to update token account data", error);
            },
          );
        }
      }, 100);
    }
  }, [sessionState, faucetUrl]);
  return (
    <Link
      {...props}
      onPress={showFaucet}
      href={faucetUrl.toString()}
      target="_blank"
    />
  );
};

const LogoutButton = ({
  sessionState,
  onLogout,
}: {
  sessionState: SessionState;
  onLogout: () => void;
}) => {
  const handleLogOut = useCallback(() => {
    if (isEstablished(sessionState)) {
      sessionState.endSession();
      onLogout();
    }
  }, [sessionState, onLogout]);

  return (
    <Button
      className={styles.logoutButton ?? ""}
      onPress={handleLogOut}
      isDisabled={!isEstablished(sessionState)}
    >
      Log Out
    </Button>
  );
};

const TruncateKey = ({ keyValue }: { keyValue: PublicKey }) =>
  useMemo(() => {
    const strKey = keyValue.toBase58();
    return `${strKey.slice(0, 4)}...${strKey.slice(-4)}`;
  }, [keyValue]);

const Tokens = ({ sessionState }: { sessionState: SessionState }) =>
  isEstablished(sessionState) && (
    <>
      <div className={styles.topButtons}>
        <FaucetButton
          sessionState={sessionState}
          className={styles.topButton ?? ""}
        >
          <CoinsIcon className={styles.icon} />
          <span className={styles.text}>Get tokens</span>
        </FaucetButton>
      </div>
      <TokenList sessionState={sessionState} />
    </>
  );

const TokenList = ({
  sessionState,
}: {
  sessionState: EstablishedSessionState;
}) => {
  const state = useTokenAccountData(sessionState);
  switch (state.type) {
    case TokenDataStateType.Error: {
      return <p>{errorToString(state.error)}</p>;
    }
    case TokenDataStateType.Loaded: {
      return state.data.tokensInWallet.length === 0 ? (
        <div className={styles.tokenListEmpty}>Your wallet is empty</div>
      ) : (
        <dl className={styles.tokenList}>
          {state.data.tokensInWallet
            .sort((a, b) => {
              if (a.name === undefined) {
                return b.name === undefined
                  ? a.mint.toString().localeCompare(b.mint.toString())
                  : 1;
              } else if (b.name === undefined) {
                return -1;
              } else {
                return a.name.toString().localeCompare(b.name.toString());
              }
            })
            .map(({ mint, amountInWallet, decimals, image, name, symbol }) => {
              const amountAsString = amountToString(amountInWallet, decimals);
              return (
                <div key={mint.toString()} className={styles.token}>
                  {image ? (
                    <img alt="" src={image} className={styles.tokenIcon} />
                  ) : (
                    <div className={styles.tokenIcon} />
                  )}
                  <dt className={styles.tokenName}>
                    {name ?? mint.toBase58()}
                  </dt>
                  <dd className={styles.amount}>
                    {amountAsString}{" "}
                    {symbol ?? (amountAsString === "1" ? "Token" : "Tokens")}
                  </dd>
                </div>
              );
            })}
        </dl>
      );
    }
    case TokenDataStateType.NotLoaded:
    case TokenDataStateType.Loading: {
      return (
        <dl className={styles.tokenList}>
          <LoadingToken />
        </dl>
      );
    }
  }
};

const LoadingToken = () => (
  <div data-is-loading="" className={styles.token}>
    <div className={styles.tokenIcon} />
    <dt className={styles.tokenName} />
    <dd className={styles.amount} />
  </div>
);

const SessionLimitsPanel = ({
  sessionState,
}: {
  sessionState: EstablishedSessionState;
}) => {
  const state = useTokenAccountData(sessionState);
  const { whitelistedTokens, enableUnlimited } = useSessionContext();

  switch (state.type) {
    case TokenDataStateType.Error: {
      return <div>{errorToString(state.error)}</div>;
    }
    case TokenDataStateType.Loaded: {
      return (
        <SessionLimits
          className={styles.sessionLimits}
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
            sessionState.type === SessionStateType.Established
              ? sessionState.setLimits
              : undefined
          }
          buttonText="Update limits"
          error={
            sessionState.type === SessionStateType.Established
              ? sessionState.updateLimitsError
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
