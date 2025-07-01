"use client";

import type { Session } from "@fogo/sessions-sdk";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import clsx from "clsx";
import Link from "next/link";
import { useCallback } from "react";

import { SessionStateType, useSession } from "./use-session";
import { useTrade } from "./use-trade";
import type { Transaction } from "./use-transaction-log";
import { useTransactionLog } from "./use-transaction-log";
import { StateType } from "../../hooks/use-async";
import { Button } from "../ui/button";

export const Demo = ({
  sponsor,
  rpc,
  addressLookupTableAddress,
}: {
  sponsor: string;
  rpc: string;
  addressLookupTableAddress: string | undefined;
}) => {
  const wallet = useWallet();
  const { appendTransaction, transactions } = useTransactionLog();
  const sessionState = useSession(
    sponsor,
    addressLookupTableAddress === undefined
      ? undefined
      : new PublicKey(addressLookupTableAddress),
    appendTransaction,
  );
  const doDisconnect = useCallback(() => {
    wallet.disconnect().catch((error: unknown) => {
      // eslint-disable-next-line no-console
      console.error(error);
    });
  }, [wallet]);

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
            {sessionState.type === SessionStateType.Established && (
              <>
                <SessionWallet session={sessionState.session} />
              </>
            )}
          </div>
          <div className="flex flex-row items-center gap-4 min-h-10">
            {sessionState.type === SessionStateType.Established && (
              <TradeButton
                session={sessionState.session}
                appendTransaction={appendTransaction}
              />
            )}
            {(sessionState.type === SessionStateType.Establishing ||
              sessionState.type === SessionStateType.NotEstablished) && (
              <Button
                {...(sessionState.type === SessionStateType.NotEstablished
                  ? {
                      onClick: sessionState.establishSession,
                    }
                  : {
                      loading: true,
                    })}
              >
                Create Session
              </Button>
            )}
            {sessionState.type === SessionStateType.Established && (
              <Button onClick={sessionState.endSession}>End Session</Button>
            )}
            {wallet.connected && (
              <Button onClick={doDisconnect}>Disconnect Wallet</Button>
            )}
          </div>
        </div>
        {sessionState.type === SessionStateType.NotEstablished &&
          sessionState.error !== undefined && (
            <div className="text-red-600">
              {errorToString(sessionState.error)}
            </div>
          )}
      </div>
      <div>
        <h2 className="text-lg font-semibold my-8">Transaction Log</h2>
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

const TradeButton = ({
  session,
  appendTransaction,
}: {
  session: Session;
  appendTransaction: (tx: Transaction) => void;
}) => {
  const { state, execute } = useTrade(session, appendTransaction);
  return (
    <Button onClick={execute} loading={state.type === StateType.Running}>
      Trade
    </Button>
  );
};

const errorToString = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === "string") {
    return error.toString();
  } else {
    return "Unknown Error";
  }
};

const SESSION_STATE_TO_BADGE_CLASSES = {
  [SessionStateType.Established]:
    "border-green-900 bg-green-100 text-green-800",
  [SessionStateType.Establishing]: "border-blue-700 bg-blue-50 text-blue-600",
  [SessionStateType.Initializing]: "border-gray-500 bg-gray-50 text-gray-400",
  [SessionStateType.NotEstablished]:
    "border-gray-700 bg-gray-100 text-gray-500",
  [SessionStateType.Restoring]: "border-blue-700 bg-blue-50 text-blue-600",
};

const SESSION_STATE_TO_DESCRIPTION = {
  [SessionStateType.Established]: "Session Established",
  [SessionStateType.Establishing]: "New Session Establishing...",
  [SessionStateType.Initializing]: "Initializing...",
  [SessionStateType.NotEstablished]: "No Session",
  [SessionStateType.Restoring]: "Restoring Session...",
};

const SessionWallet = ({ session }: { session: Session }) => {
  const key = session.publicKey.toBase58();
  return (
    <div className="text-sm">
      Wallet:{" "}
      <code className="bg-black/10 px-2 py-0.5 -my-0.5">
        {key.slice(0, 4)}...{key.slice(-4)}
      </code>
    </div>
  );
};
