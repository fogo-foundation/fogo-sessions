"use client";

import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import {
  isEstablished,
  SessionStateType,
  useSession,
} from "@fogo/sessions-sdk-react";
import { NATIVE_MINT } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import clsx from "clsx";
import Link from "next/link";

import { useAirdrop } from "./use-airdrop";
import { useTrade } from "./use-trade";
import type { Transaction } from "./use-transaction-log";
import { useTransactionLog } from "./use-transaction-log";
import { StateType as AsyncStateType } from "../../hooks/use-async";
import { Button } from "../ui/button";

export const Demo = ({ rpc }: { rpc: string }) => {
  const { appendTransaction, transactions } = useTransactionLog();
  const sessionState = useSession();

  return (
    <div className="flex flex-col">
      <div className="h-32">
        <div className="flex flex-col md:flex-row-reverse justify-between items-start gap-4 w-full">
          <div
            className={clsx(
              "border border-px px-2 py-0.5",
              SESSION_STATE_TO_BADGE_CLASSES[sessionState.type],
            )}
          >
            {SESSION_STATE_TO_DESCRIPTION[sessionState.type]}
            {isEstablished(sessionState) && (
              <SessionWallet sessionState={sessionState} />
            )}
          </div>
          <div className="flex flex-row items-center gap-4 min-h-10">
            {isEstablished(sessionState) && (
              <>
                <AirdropButton
                  sessionState={sessionState}
                  appendTransaction={appendTransaction}
                  amount={1}
                  mint={NATIVE_MINT}
                />
                <TradeButton
                  sessionState={sessionState}
                  appendTransaction={appendTransaction}
                  amount={0.5}
                  mint={NATIVE_MINT}
                />
              </>
            )}
          </div>
        </div>
      </div>
      <div>
        <h2 className="text-lg font-semibold mt-8 mb-4">Transaction Log</h2>
        <ul>
          {transactions.map((tx) => (
            <li key={tx.signature} className="flex flex-row gap-4 items-center">
              {tx.success ? "✅" : "❌"}
              <Link
                href={`https://explorer.fogo.io/tx/${tx.signature}?cluster=custom&customUrl=${rpc}`}
                target="_blank"
                rel="noreferrer"
                className="text-blue-700 underline"
              >
                {tx.description}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const AirdropButton = ({
  sessionState,
  appendTransaction,
  amount,
  mint,
}: {
  sessionState: EstablishedSessionState;
  appendTransaction: (tx: Transaction) => void;
  amount: number;
  mint: PublicKey;
}) => {
  const { state, execute } = useAirdrop(
    sessionState,
    appendTransaction,
    amount,
    mint,
  );
  return (
    <Button onClick={execute} loading={state.type === AsyncStateType.Running}>
      Airdrop {amount} SOL
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
    <Button onClick={execute} loading={state.type === AsyncStateType.Running}>
      Trade {amount} SOL
    </Button>
  );
};

const SESSION_STATE_TO_BADGE_CLASSES: Record<SessionStateType, string> = {
  [SessionStateType.CheckingStoredSession]:
    "border-blue-700 bg-blue-50 text-blue-600",
  [SessionStateType.Established]:
    "border-green-900 bg-green-100 text-green-800",
  [SessionStateType.Initializing]: "border-gray-500 bg-gray-50 text-gray-400",
  [SessionStateType.NotEstablished]:
    "border-gray-700 bg-gray-100 text-gray-500",
  [SessionStateType.RequestingLimits]:
    "border-blue-700 bg-blue-50 text-blue-600",
  [SessionStateType.RestoringSession]:
    "border-blue-700 bg-blue-50 text-blue-600",
  [SessionStateType.SelectingWallet]:
    "border-blue-700 bg-blue-50 text-blue-600",
  [SessionStateType.SettingLimits]: "border-blue-700 bg-blue-50 text-blue-600",
  [SessionStateType.UpdatingLimits]: "border-blue-700 bg-blue-50 text-blue-600",
  [SessionStateType.WalletConnecting]:
    "border-blue-700 bg-blue-50 text-blue-600",
};

const SESSION_STATE_TO_DESCRIPTION: Record<SessionStateType, string> = {
  [SessionStateType.CheckingStoredSession]: "Checking for stored session...",
  [SessionStateType.Established]: "Established",
  [SessionStateType.Initializing]: "Booting App",
  [SessionStateType.NotEstablished]: "No Session",
  [SessionStateType.RequestingLimits]: "Requesting limits...",
  [SessionStateType.RestoringSession]: "Restoring stored session...",
  [SessionStateType.SelectingWallet]: "Selecting Solana wallet...",
  [SessionStateType.SettingLimits]: "Setting requested limits...",
  [SessionStateType.UpdatingLimits]: "Updating limits...",
  [SessionStateType.WalletConnecting]: "Connecting Solana wallet...",
};

const SessionWallet = ({
  sessionState,
}: {
  sessionState: EstablishedSessionState;
}) => {
  const key = sessionState.walletPublicKey.toBase58();
  return (
    <div className="text-sm">
      Wallet:{" "}
      <code className="bg-black/10 px-2 py-0.5 -my-0.5">
        {key.slice(0, 4)}...{key.slice(-4)}
      </code>
    </div>
  );
};
