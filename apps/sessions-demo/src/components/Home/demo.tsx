"use client";

import type { Session } from "@fogo/sessions-sdk";
import { NATIVE_MINT } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import clsx from "clsx";
import Link from "next/link";
import { useCallback } from "react";

import { useAirdrop } from "./use-airdrop";
import { SessionStateType, useSession } from "./use-session";
import { useTokenAccountData } from "./use-token-account-data";
import { useTrade } from "./use-trade";
import type { Transaction } from "./use-transaction-log";
import { useTransactionLog } from "./use-transaction-log";
import { StateType as AsyncStateType } from "../../hooks/use-async";
import { StateType } from "../../hooks/use-data";
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
              <>
                <AirdropButton
                  session={sessionState.session}
                  appendTransaction={appendTransaction}
                  amount={1}
                  mint={NATIVE_MINT}
                />
                <TradeButton
                  session={sessionState.session}
                  appendTransaction={appendTransaction}
                  amount={0.5}
                  mint={NATIVE_MINT}
                />
              </>
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
      {sessionState.type === SessionStateType.Established && (
        <TokenAccounts session={sessionState.session} />
      )}
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
  session,
  appendTransaction,
  amount,
  mint,
}: {
  session: Session;
  appendTransaction: (tx: Transaction) => void;
  amount: number;
  mint: PublicKey;
}) => {
  const { state, execute } = useAirdrop(
    session,
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
  session,
  appendTransaction,
  mint,
}: {
  amount: number;
  session: Session;
  appendTransaction: (tx: Transaction) => void;
  mint: PublicKey;
}) => {
  const { state, execute } = useTrade(session, appendTransaction, amount, mint);
  return (
    <Button onClick={execute} loading={state.type === AsyncStateType.Running}>
      Trade {amount} SOL
    </Button>
  );
};

const TokenAccounts = ({ session }: { session: Session }) => {
  const state = useTokenAccountData(session);
  switch (state.type) {
    case StateType.Error: {
      return <div className="text-red-600">{errorToString(state.error)}</div>;
    }
    case StateType.Loaded: {
      return (
        <>
          <div className="border border-y border-black/40 mt-8 p-4">
            <h2 className="text-lg font-semibold mb-4">Session Limits</h2>
            <dl>
              {state.data.sessionLimits.map(({ name, mint, sessionLimit }) => (
                <div key={mint} className="flex flex-row items-center gap-4">
                  <dt>{name}</dt>
                  <dd className="font-bold">{sessionLimit}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="border border-y border-black/40 mt-8 p-4">
            <h2 className="text-lg font-semibold mb-4">Wallet Contents</h2>
            <ul>
              {state.data.tokensInWallet.map(
                ({ name, mint, amountInWallet }) => (
                  <div key={mint} className="flex flex-row items-center gap-4">
                    <dt>{name}</dt>
                    <dd className="font-bold">{amountInWallet}</dd>
                  </div>
                ),
              )}
            </ul>
          </div>
        </>
      );
    }
    case StateType.NotLoaded:
    case StateType.Loading: {
      return "Loading...";
    }
  }
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
