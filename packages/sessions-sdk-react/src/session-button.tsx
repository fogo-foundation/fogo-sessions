"use client";

import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { LockIcon } from "@phosphor-icons/react/dist/ssr/Lock";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { PublicKey } from "@solana/web3.js";
import { motion } from "motion/react";
import { useMemo, useState, useRef, useCallback, useEffect } from "react";
import {
  Button as UnstyledButton,
  Dialog,
  Popover,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Heading,
} from "react-aria-components";

import { Button } from "./button.js";
import { CopyButton } from "./copy-button.js";
import { deserializePublicKeyMap } from "./deserialize-public-key.js";
import { FogoLogo } from "./fogo-logo.js";
import { FogoWordmark } from "./fogo-wordmark.js";
import { ReceivePage } from "./receive-page.js";
import { SelectTokenPage } from "./select-token-page.js";
import { SendTokenPage } from "./send-token-page.js";
import styles from "./session-button.module.css";
import { SessionLimitsTab } from "./session-limits-tab.js";
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
import { TruncateKey } from "./truncate-key.js";
import { WalletPage } from "./wallet-page.js";

type Props = {
  requestedLimits?: Map<PublicKey, bigint> | Record<string, bigint> | undefined;
  compact?: boolean | undefined;
};

export const SessionButton = ({ requestedLimits, compact }: Props) => {
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
  const [currentScreen, setCurrentScreen] = useState<TokenScreen>(
    TokenScreen.Wallet(),
  );

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
      <UnstyledButton
        ref={triggerRef}
        className={styles.sessionButton ?? ""}
        isDisabled={isLoading}
        isPending={isLoading}
        onPress={handlePress}
        data-session-panel-open={sessionPanelOpen ? "" : undefined}
        data-is-signed-in={isEstablished(sessionState) ? "" : undefined}
        data-compact={compact ? "" : undefined}
      >
        <div className={styles.fogoLogoContainer}>
          <FogoLogo className={styles.fogoLogo} />
        </div>
        {!compact && (
          <span className={styles.contents}>
            {isEstablished(sessionState) ? (
              <TruncateKey keyValue={sessionState.walletPublicKey} />
            ) : (
              "Sign in"
            )}
          </span>
        )}
        {compact && !isEstablished(sessionState) && (
          <LockIcon className={styles.lockIcon} />
        )}
        <div className={styles.arrowContainer}>
          <CaretDownIcon className={styles.arrow} />
        </div>
      </UnstyledButton>
      <Popover
        className={styles.sessionPanelPopover ?? ""}
        offset={1}
        isOpen={sessionPanelOpen && isEstablished(sessionState)}
        triggerRef={triggerRef}
        onOpenChange={handleSessionPanelOpenChange}
      >
        <Dialog className={styles.sessionPanel ?? ""}>
          <div className={styles.header}>
            <Heading slot="title" className={styles.title}>
              Your Wallet
            </Heading>
            {isEstablished(sessionState) && (
              <CopyButton text={sessionState.walletPublicKey.toBase58()}>
                <TruncateKey keyValue={sessionState.walletPublicKey} />
              </CopyButton>
            )}
            <Button variant="ghost" onPress={closeSessionPanel}>
              <XIcon />
            </Button>
          </div>
          {whitelistedTokens.length === 0 ? (
            <div className={styles.tabPanel}>
              {isEstablished(sessionState) && (
                <Tokens
                  sessionState={sessionState}
                  currentScreen={currentScreen}
                  setCurrentScreen={setCurrentScreen}
                />
              )}
            </div>
          ) : (
            <Tabs className={styles.tabs ?? ""}>
              <TabList
                aria-label="Wallet"
                className={styles.tabList ?? ""}
                items={[
                  { id: "tokens", name: "Tokens" },
                  { id: "session-limits", name: "Session" },
                ]}
              >
                {({ id, name }) => (
                  <Tab className={styles.tab ?? ""} id={id}>
                    {({ isSelected }) => (
                      <>
                        <span>{name}</span>
                        {isSelected && (
                          <motion.span
                            layoutId="underline"
                            className={styles.underline}
                            transition={{
                              type: "spring",
                              bounce: 0.6,
                              duration: 0.6,
                            }}
                            style={{ originY: "top" }}
                          />
                        )}
                      </>
                    )}
                  </Tab>
                )}
              </TabList>
              <TabPanel className={styles.tabPanel ?? ""} id="tokens">
                {isEstablished(sessionState) && (
                  <Tokens
                    sessionState={sessionState}
                    currentScreen={currentScreen}
                    setCurrentScreen={setCurrentScreen}
                  />
                )}
              </TabPanel>
              <TabPanel
                className={styles.tabPanel ?? ""}
                id="session-limits"
                data-panel="session-limits"
              >
                {isEstablished(sessionState) && (
                  <SessionLimitsTab sessionState={sessionState} />
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
      variant="ghost"
      className={styles.logoutButton ?? ""}
      onPress={handleLogOut}
      isDisabled={!isEstablished(sessionState)}
    >
      Log Out
    </Button>
  );
};

const Tokens = ({
  sessionState,
  currentScreen,
  setCurrentScreen,
}: {
  sessionState: EstablishedSessionState;
  currentScreen: TokenScreen;
  setCurrentScreen: (screen: TokenScreen) => void;
}) => {
  const showWallet = useCallback(() => {
    setCurrentScreen(TokenScreen.Wallet());
  }, [setCurrentScreen]);
  const showSend = useCallback(
    (opts: Parameters<typeof TokenScreen.Send>[0]) => {
      setCurrentScreen(TokenScreen.Send(opts));
    },
    [setCurrentScreen],
  );
  const showReceive = useCallback(() => {
    setCurrentScreen(TokenScreen.Receive());
  }, [setCurrentScreen]);
  const showSelectTokenToSend = useCallback(() => {
    setCurrentScreen(TokenScreen.SelectTokenToSend());
  }, [setCurrentScreen]);
  switch (currentScreen.type) {
    case TokenScreenType.SelectTokenToSend: {
      return (
        <SelectTokenPage
          onPressBack={showWallet}
          onPressReceive={showReceive}
          onPressSend={(token) => {
            showSend({
              prevScreen: TokenScreenType.SelectTokenToSend,
              amountAvailable: token.amountInWallet,
              decimals: token.decimals,
              tokenMint: token.mint,
              icon: token.image,
              symbol: token.symbol,
              tokenName: token.name,
            });
          }}
          sessionState={sessionState}
        />
      );
    }
    case TokenScreenType.Send: {
      {
        return (
          <SendTokenPage
            sessionState={sessionState}
            onPressBack={() => {
              if (
                currentScreen.prevScreen === TokenScreenType.SelectTokenToSend
              ) {
                showSelectTokenToSend();
              } else {
                showWallet();
              }
            }}
            decimals={currentScreen.decimals}
            tokenMint={currentScreen.tokenMint}
            tokenName={currentScreen.tokenName}
            icon={currentScreen.icon}
            symbol={currentScreen.symbol}
            amountAvailable={currentScreen.amountAvailable}
            onSendComplete={showWallet}
          />
        );
      }
    }
    case TokenScreenType.Receive: {
      return (
        <ReceivePage
          key="receive"
          sessionState={sessionState}
          onPressDone={showWallet}
        />
      );
    }
    case TokenScreenType.Wallet: {
      return (
        <WalletPage
          key="wallet"
          onPressReceive={showReceive}
          onPressSend={showSelectTokenToSend}
          onPressSendForToken={(token) => {
            showSend({
              prevScreen: TokenScreenType.Wallet,
              amountAvailable: token.amountInWallet,
              decimals: token.decimals,
              tokenMint: token.mint,
              icon: token.image,
              symbol: token.symbol,
              tokenName: token.name,
            });
          }}
          sessionState={sessionState}
        />
      );
    }
  }
};

enum TokenScreenType {
  SelectTokenToSend,
  Send,
  Receive,
  Wallet,
}

const TokenScreen = {
  SelectTokenToSend: () => ({
    type: TokenScreenType.SelectTokenToSend as const,
  }),
  Send: (opts: {
    prevScreen: TokenScreenType;
    icon?: string | undefined;
    tokenName?: string | undefined;
    tokenMint: PublicKey;
    decimals: number;
    symbol?: string | undefined;
    amountAvailable: bigint;
  }) => ({ type: TokenScreenType.Send as const, ...opts }),
  Receive: () => ({ type: TokenScreenType.Receive as const }),
  Wallet: () => ({ type: TokenScreenType.Wallet as const }),
};
type TokenScreen = ReturnType<(typeof TokenScreen)[keyof typeof TokenScreen]>;
