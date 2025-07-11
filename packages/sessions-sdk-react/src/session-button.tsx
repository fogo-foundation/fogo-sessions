"use client";

import { PublicKey } from "@solana/web3.js";
import { useMemo, useState, useRef, useCallback } from "react";
import {
  Button,
  Dialog,
  OverlayArrow,
  Popover,
  Tabs,
  TabList,
  Tab,
  TabPanel,
  Heading,
} from "react-aria-components";

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
  isEstablished,
} from "./session-provider.js";
import { useTokenWhitelist } from "./token-whitelist-provider.js";
import {
  StateType as TokenDataStateType,
  useTokenAccountData,
} from "./use-token-account-data.js";
import {
  StateType as TokenMetadataStateType,
  useTokenMetadata,
} from "./use-token-metadata.js";

export const SessionButton = ({
  requestedLimits,
}: {
  requestedLimits?: Map<PublicKey, bigint> | Record<string, bigint> | undefined;
}) => {
  const sessionState = useSession();
  const [sessionPanelOpen, setSessionPanelOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const handlePress = useCallback(() => {
    if (isEstablished(sessionState)) {
      setSessionPanelOpen(true);
    } else if (sessionState.type === SessionStateType.NotEstablished) {
      sessionState.establishSession(
        requestedLimits === undefined
          ? undefined
          : deserializePublicKeyMap(requestedLimits),
      );
    }
  }, [requestedLimits, sessionState]);
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
    SessionStateType.RestoringSession,
    SessionStateType.RequestingLimits,
    SessionStateType.SettingLimits,
    SessionStateType.WalletConnecting,
    SessionStateType.SelectingWallet,
  ].includes(sessionState.type);

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
            Your Wallet
          </Heading>
          <Tabs className={styles.tabs ?? ""}>
            <TabList aria-label="Wallet" className={styles.tabList ?? ""}>
              <Tab className={styles.tab ?? ""} id="tokens">
                Tokens
              </Tab>
              <Tab className={styles.tab ?? ""} id="session-limits">
                Session
              </Tab>
            </TabList>
            <TabPanel className={styles.tabPanel ?? ""} id="tokens">
              {isEstablished(sessionState) && (
                <Tokens sessionState={sessionState} />
              )}
            </TabPanel>
            <TabPanel className={styles.tabPanel ?? ""} id="session-limits">
              {isEstablished(sessionState) && (
                <SessionLimitsPanel sessionState={sessionState} />
              )}
            </TabPanel>
          </Tabs>
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

const Tokens = ({
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
      return (
        <dl className={styles.tokenList}>
          {state.data.tokensInWallet.map(
            ({ mint, amountInWallet, decimals }) => (
              <Token
                key={mint.toBase58()}
                mint={mint}
                decimals={decimals}
                amountInWallet={amountInWallet}
              />
            ),
          )}
        </dl>
      );
    }
    case TokenDataStateType.NotLoaded:
    case TokenDataStateType.Loading: {
      return <p>Loading...</p>;
    }
  }
};

const Token = ({
  mint,
  decimals,
  amountInWallet,
}: {
  mint: PublicKey;
  decimals: number;
  amountInWallet: bigint;
}) => {
  const metadata = useTokenMetadata(mint);
  switch (metadata.type) {
    case TokenMetadataStateType.Error:
    case TokenMetadataStateType.Loaded: {
      const amountAsString = amountToString(amountInWallet, decimals);
      const name =
        metadata.type === TokenMetadataStateType.Loaded
          ? (metadata.data.name ?? mint.toBase58())
          : mint.toBase58();
      const defaultSymbol = amountAsString === "1" ? "Token" : "Tokens";
      const symbol =
        metadata.type === TokenMetadataStateType.Loaded
          ? (metadata.data.symbol ?? defaultSymbol)
          : "";
      return (
        <div key={mint.toBase58()} className={styles.token}>
          <div className={styles.tokenIcon} />
          <dt className={styles.tokenName}>{name}</dt>
          <dd className={styles.amount}>
            {amountAsString} {symbol}
          </dd>
        </div>
      );
    }

    case TokenMetadataStateType.Loading:
    case TokenMetadataStateType.NotLoaded: {
      return <p>Loading...</p>;
    }
  }
};

const SessionLimitsPanel = ({
  sessionState,
}: {
  sessionState: EstablishedSessionState;
}) => {
  const state = useTokenAccountData(sessionState);
  const tokenWhitelist = useTokenWhitelist();

  switch (state.type) {
    case TokenDataStateType.Error: {
      return <div>{errorToString(state.error)}</div>;
    }
    case TokenDataStateType.Loaded: {
      return (
        <SessionLimits
          className={styles.sessionLimits}
          tokens={tokenWhitelist}
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
        />
      );
    }
    case TokenDataStateType.NotLoaded:
    case TokenDataStateType.Loading: {
      return "Loading...";
    }
  }
};
