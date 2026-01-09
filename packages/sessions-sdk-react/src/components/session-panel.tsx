"use client";

import { Network } from "@fogo/sessions-sdk";
import { XIcon } from "@phosphor-icons/react/dist/ssr/X";
import clsx from "clsx";
import type { ComponentProps } from "react";
import { useCallback, useEffect, useState } from "react";
import { Heading } from "react-aria-components";
import { useSessionContext } from "../hooks/use-session.js";
import type { Token } from "../hooks/use-token-account-data.js";
import type {
  EstablishedSessionState,
  SessionState,
} from "../session-state.js";
import { isEstablished } from "../session-state.js";
import { Button } from "./component-library/Button/index.js";
import { CopyButton } from "./component-library/CopyButton/index.js";
import { Link } from "./component-library/Link/index.js";
import { TabList, TabPanel, Tabs } from "./component-library/Tabs/index.js";
import { DepositPage } from "./deposit-page.js";
import { FogoWordmark } from "./fogo-wordmark.js";
import { GetTokensPage } from "./get-tokens-page.js";
import { ReceivePage } from "./receive-page.js";
import { SelectTokenPage } from "./select-token-page.js";
import { SendTokenPage } from "./send-token-page.js";
import { SessionLimitsTab } from "./session-limits-tab.js";
import styles from "./session-panel.module.css";
import { TruncateKey } from "./truncate-key.js";
import { WalletPage } from "./wallet-page.js";
import { WithdrawPage } from "./withdraw-page.js";

type Props = Omit<ComponentProps<"div">, "children"> & {
  onClose?: (() => void) | undefined;
};

export const SessionPanel = ({ onClose, className, ...props }: Props) => {
  const { sessionState, whitelistedTokens, showBridgeIn, setShowBridgeIn } =
    useSessionContext();
  const [currentScreen, setCurrentScreen] = useState<TokenScreen>(
    TokenScreen.Wallet(),
  );

  useEffect(() => {
    if (showBridgeIn) {
      setCurrentScreen(TokenScreen.Deposit());
      setShowBridgeIn(false);
    }
  }, [showBridgeIn, setShowBridgeIn]);

  return (
    <div className={clsx(styles.sessionPanel, className)} {...props}>
      <div className={styles.header}>
        <Heading slot="title" className={styles.title}>
          Your <FogoWordmark /> Wallet
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
      <Tabs>
        <TabList
          aria-label="Wallet"
          items={[
            { id: "tokens", name: "Tokens" },
            { id: "activity", name: "Activity" },
            ...(whitelistedTokens.length === 0
              ? []
              : [{ id: "session-limits", name: "Session" }]),
          ]}
        />
        <TabPanel id="tokens" className={styles.tabPanel ?? ""}>
          {isEstablished(sessionState) && (
            <Tokens
              sessionState={sessionState}
              currentScreen={currentScreen}
              setCurrentScreen={setCurrentScreen}
            />
          )}
        </TabPanel>
        <TabPanel id="activity" className={styles.tabPanel ?? ""}>
          {isEstablished(sessionState) && (
            <Activity sessionState={sessionState} />
          )}
        </TabPanel>
        {whitelistedTokens.length > 0 && (
          <TabPanel
            id="session-limits"
            data-panel="session-limits"
            className={styles.tabPanel ?? ""}
          >
            {isEstablished(sessionState) && (
              <SessionLimitsTab sessionState={sessionState} />
            )}
          </TabPanel>
        )}
      </Tabs>
      <div className={styles.footer}>
        <FogoWordmark className={styles.fogoWordmark} />
        <LogoutButton sessionState={sessionState} onLogout={onClose} />
      </div>
    </div>
  );
};

const Activity = ({
  sessionState,
}: {
  sessionState: EstablishedSessionState;
}) => (
  <div className={styles.activity}>
    <p className={styles.activityMessage}>
      Transaction history is coming to Fogo Sessions.
    </p>
    <p className={styles.activityMessage}>
      In the meantime, you can see your transaction history on{" "}
      <Link
        target="_blank"
        href={`https://fogoscan.com/account/${sessionState.walletPublicKey.toBase58()}#transfers`}
      >
        the Fogo explorer
      </Link>
      .
    </p>
  </div>
);

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
  const { network } = useSessionContext();
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
  const showGet = useCallback(() => {
    setCurrentScreen(TokenScreen.Get());
  }, [setCurrentScreen]);
  const showWithdraw = useCallback(() => {
    setCurrentScreen(TokenScreen.Withdraw());
  }, [setCurrentScreen]);
  const showDeposit = useCallback(() => {
    setCurrentScreen(TokenScreen.Deposit());
  }, [setCurrentScreen]);
  const showSelectTokenToSend = useCallback(() => {
    setCurrentScreen(TokenScreen.SelectTokenToSend());
  }, [setCurrentScreen]);
  switch (currentScreen.type) {
    case TokenScreenType.SelectTokenToSend: {
      return (
        <SelectTokenPage
          onPressBack={showWallet}
          onPressTransferIn={showDeposit}
          onPressSend={(token) => {
            showSend({ token, prevScreen: TokenScreenType.SelectTokenToSend });
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
            token={currentScreen.token}
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
    case TokenScreenType.Get: {
      return (
        <GetTokensPage
          onPressBack={showWallet}
          onPressDeposit={showDeposit}
          sessionState={sessionState}
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
    case TokenScreenType.Deposit: {
      return (
        <DepositPage
          sessionState={sessionState}
          onPressBack={network === Network.Mainnet ? showWallet : showGet}
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
          onPressGet={showGet}
          onPressTransferIn={showDeposit}
          onPressSendForToken={(token) => {
            showSend({ token, prevScreen: TokenScreenType.Wallet });
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
  Get,
  Deposit,
  Withdraw,
  Wallet,
}

const TokenScreen = {
  SelectTokenToSend: () => ({
    type: TokenScreenType.SelectTokenToSend as const,
  }),
  Send: (opts: { token: Token; prevScreen: TokenScreenType }) => ({
    type: TokenScreenType.Send as const,
    ...opts,
  }),
  Receive: () => ({ type: TokenScreenType.Receive as const }),
  Get: () => ({ type: TokenScreenType.Get as const }),
  Withdraw: () => ({ type: TokenScreenType.Withdraw as const }),
  Deposit: () => ({ type: TokenScreenType.Deposit as const }),
  Wallet: () => ({ type: TokenScreenType.Wallet as const }),
};
type TokenScreen = ReturnType<(typeof TokenScreen)[keyof typeof TokenScreen]>;
