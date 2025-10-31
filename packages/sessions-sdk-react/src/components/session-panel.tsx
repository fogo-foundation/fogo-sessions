"use client";

import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import { PublicKey } from "@solana/web3.js";
import clsx from "clsx";
import { motion } from "motion/react";
import type { ComponentProps } from "react";
import { useState, useCallback } from "react";
import { Tabs, TabList, Tab, TabPanel, Heading } from "react-aria-components";

import type {
  EstablishedSessionState,
  SessionState,
} from "../session-state.js";
import { Button } from "./button.js";
import { CopyButton } from "./copy-button.js";
import { FogoWordmark } from "./fogo-wordmark.js";
import { ReceivePage } from "./receive-page.js";
import { SelectTokenPage } from "./select-token-page.js";
import { SendTokenPage } from "./send-token-page.js";
import { SessionLimitsTab } from "./session-limits-tab.js";
import styles from "./session-panel.module.css";
import { useSessionContext } from "../hooks/use-session.js";
import { isEstablished } from "../session-state.js";
import { TruncateKey } from "./truncate-key.js";
import { WalletPage } from "./wallet-page.js";
import { WithdrawPage } from "./withdraw-page.js";

type Props = Omit<ComponentProps<"div">, "children"> & {
  onClose?: (() => void) | undefined;
};

export const SessionPanel = ({ onClose, className, ...props }: Props) => {
  const { sessionState, whitelistedTokens } = useSessionContext();
  const [currentScreen, setCurrentScreen] = useState<TokenScreen>(
    TokenScreen.Wallet(),
  );

  return (
    <div className={clsx(styles.sessionPanel, className)} {...props}>
      <div className={styles.header}>
        <Heading slot="title" className={styles.title}>
          Your Wallet
        </Heading>
        {isEstablished(sessionState) && (
          <CopyButton text={sessionState.walletPublicKey.toBase58()}>
            <TruncateKey keyValue={sessionState.walletPublicKey} />
          </CopyButton>
        )}
        {onClose && (
          <Button variant="ghost" onPress={onClose}>
            <XIcon />
          </Button>
        )}
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
        <LogoutButton sessionState={sessionState} onLogout={onClose} />
      </div>
    </div>
  );
};

const LogoutButton = ({
  sessionState,
  onLogout,
}: {
  sessionState: SessionState;
  onLogout?: (() => void) | undefined;
}) => {
  const handleLogOut = useCallback(() => {
    if (isEstablished(sessionState)) {
      sessionState.endSession();
      onLogout?.();
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
  const showWithdraw = useCallback(() => {
    setCurrentScreen(TokenScreen.Withdraw());
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
    case TokenScreenType.Withdraw: {
      return (
        <WithdrawPage
          key="withdraw"
          sessionState={sessionState}
          onPressBack={showWallet}
          onSendComplete={showWallet}
        />
      );
    }
    case TokenScreenType.Wallet: {
      return (
        <WalletPage
          key="wallet"
          onPressWithdraw={showWithdraw}
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
  Withdraw,
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
  Withdraw: () => ({ type: TokenScreenType.Withdraw as const }),
  Wallet: () => ({ type: TokenScreenType.Wallet as const }),
};
type TokenScreen = ReturnType<(typeof TokenScreen)[keyof typeof TokenScreen]>;
