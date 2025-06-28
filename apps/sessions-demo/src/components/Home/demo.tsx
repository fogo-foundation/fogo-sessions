"use client";

import type { Session } from "@fogo/sessions-sdk";
import { SessionResultType } from "@fogo/sessions-sdk";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import clsx from "clsx";
import Link from "next/link";
import { useCallback } from "react";

import { useSession } from "./use-session";
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
  const { establishSession, state: sessionState } = useSession(
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
        <div className="flex flex-row justify-between items-center gap-4 w-full">
          <div className="flex flex-row items-center gap-4">
            {sessionState.type === StateType.Complete &&
            sessionState.result.type === SessionResultType.Success ? (
              <TradeButton
                session={sessionState.result.session}
                appendTransaction={appendTransaction}
              />
            ) : (
              <Button
                onClick={establishSession}
                loading={sessionState.type === StateType.Running}
              >
                Create Session
              </Button>
            )}
            {wallet.connected && (
              <Button onClick={doDisconnect}>Disconnect Wallet</Button>
            )}
          </div>
          <div
            className={clsx(
              "border border-px px-2 py-0.5",
              sessionState.type === StateType.Complete &&
                sessionState.result.type === SessionResultType.Success
                ? "border-green-900 bg-green-100 text-green-800"
                : "border-gray-700 bg-gray-11 text-gray-500",
            )}
          >
            {sessionState.type === StateType.Complete &&
            sessionState.result.type === SessionResultType.Success
              ? "Session established"
              : "No session"}
          </div>
        </div>
        {sessionState.type === StateType.Error && (
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
