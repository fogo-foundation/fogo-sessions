"use client";

import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import {
  isEstablished,
  SessionStateType,
  useSession,
} from "@fogo/sessions-sdk-react";
import { NATIVE_MINT } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import Link from "next/link";
import { useMemo } from "react";

import styles from "./demo.module.scss";
import { useAirdrop } from "./use-airdrop";
import { useTrade } from "./use-trade";
import type { Transaction } from "./use-transaction-log";
import { useTransactionLog } from "./use-transaction-log";
import { StateType as AsyncStateType } from "../../hooks/use-async";
import { Button } from "../Button";

export const Demo = ({
  rpc,
  faucetAvailable,
}: {
  rpc: string;
  faucetAvailable: boolean;
}) => {
  const { appendTransaction, transactions } = useTransactionLog();
  const sessionState = useSession();

  return (
    <>
      <section className={styles.top}>
        <div
          data-state={SESSION_STATE_TO_BADGE_STATE[sessionState.type]}
          className={styles.badge}
        >
          {SESSION_STATE_TO_DESCRIPTION[sessionState.type]}
          {isEstablished(sessionState) && (
            <div className={styles.sessionWallet}>
              Wallet:{" "}
              <code className={styles.walletAddress}>
                <Truncate value={sessionState.walletPublicKey.toBase58()} />
              </code>
            </div>
          )}
        </div>
        {isEstablished(sessionState) && (
          <div className={styles.buttons}>
            {faucetAvailable && (
              <AirdropButton
                sessionState={sessionState}
                appendTransaction={appendTransaction}
              />
            )}
            <TradeButton
              sessionState={sessionState}
              appendTransaction={appendTransaction}
              amount={0.5}
              mint={NATIVE_MINT}
            />
          </div>
        )}
      </section>
      <section className={styles.txLog}>
        <h2 className={styles.title}>Transaction Log</h2>
        <ul className={styles.txList}>
          {transactions.map((tx) => (
            <li key={tx.signature}>
              {tx.success ? "✅" : "❌"}
              <Link
                href={`https://explorer.fogo.io/tx/${tx.signature}?cluster=custom&customUrl=${rpc}`}
                target="_blank"
                rel="noreferrer"
                className={styles.exlporerLink}
              >
                {tx.description}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
};

const AirdropButton = ({
  sessionState,
  appendTransaction,
}: {
  sessionState: EstablishedSessionState;
  appendTransaction: (tx: Transaction) => void;
}) => {
  const { state, execute } = useAirdrop(sessionState, appendTransaction);
  return (
    <Button onClick={execute} isPending={state.type === AsyncStateType.Running}>
      Airdrop 1 FOGO
    </Button>
  );
};

const TradeButton = ({
  amount,
  sessionState,
  appendTransaction,
  mint,
}: {
  amount: number;
  sessionState: EstablishedSessionState;
  appendTransaction: (tx: Transaction) => void;
  mint: PublicKey;
}) => {
  const { state, execute } = useTrade(
    sessionState,
    appendTransaction,
    amount,
    mint,
  );
  return (
    <Button onClick={execute} isPending={state.type === AsyncStateType.Running}>
      Trade {amount} FOGO
    </Button>
  );
};

const SESSION_STATE_TO_BADGE_STATE: Record<SessionStateType, string> = {
  [SessionStateType.CheckingStoredSession]: "loading",
  [SessionStateType.Established]: "established",
  [SessionStateType.Initializing]: "initializing",
  [SessionStateType.NotEstablished]: "notEstablished",
  [SessionStateType.RequestingLimits]: "loading",
  [SessionStateType.SelectingWallet]: "loading",
  [SessionStateType.SettingLimits]: "loading",
  [SessionStateType.UpdatingSession]: "loading",
  [SessionStateType.WalletConnecting]: "loading",
  [SessionStateType.RequestingExtendedExpiry]: "established",
  [SessionStateType.RequestingIncreasedLimits]: "established",
};

const SESSION_STATE_TO_DESCRIPTION: Record<SessionStateType, string> = {
  [SessionStateType.CheckingStoredSession]: "Checking for stored session...",
  [SessionStateType.Established]: "Established",
  [SessionStateType.Initializing]: "Booting App",
  [SessionStateType.NotEstablished]: "No Session",
  [SessionStateType.RequestingLimits]: "Requesting limits...",
  [SessionStateType.SelectingWallet]: "Selecting Solana wallet...",
  [SessionStateType.SettingLimits]: "Setting requested limits...",
  [SessionStateType.UpdatingSession]: "Updating session...",
  [SessionStateType.WalletConnecting]: "Connecting Solana wallet...",
  [SessionStateType.RequestingExtendedExpiry]: "Requesting extended expiry...",
  [SessionStateType.RequestingIncreasedLimits]:
    "Requesting increased limits...",
};

const Truncate = ({ value }: { value: string }) => useTruncated(value);

const useTruncated = (value: string) =>
  useMemo(() => `${value.slice(0, 4)}...${value.slice(-4)}`, [value]);
