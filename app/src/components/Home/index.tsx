"use client";

import { Button } from "@/components/ui/button";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import "@solana/wallet-adapter-react-ui/styles.css";
import {
  WalletDisconnectButton,
  WalletMultiButton,
} from "@/components/WalletButton";
import {
  Ed25519Program,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useCallback, useState } from "react";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import sessionManagerIdl from "@/idl/session_manager.json";
import type { SessionManager } from "@/idl/session_manager";

const SPONSOR = new PublicKey(process.env.NEXT_PUBLIC_SPONSOR_KEY!);
const SOLANA_RPC = process.env.NEXT_PUBLIC_SOLANA_RPC!;

const handleEnableTrading = async (
  sessionManagerProgram: Program<SessionManager>,
  publicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<{ link: string; status: "success" | "error" }> => {
  const provider = sessionManagerProgram.provider;
  const sessionKey = Keypair.generate();

  // TODO: This should be a function
  const message = new TextEncoder().encode(
    `Fogo Sessions:\nSigning this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.\n\ndomain: gasless-trading.vercel.app\nnonce: ${sessionKey.publicKey.toBase58()}\nsession_key: ${sessionKey.publicKey.toBase58()}\nextra: extra`,
  );

  const intentSignature = await signMessage(message);

  const intentInstruction = Ed25519Program.createInstructionWithPublicKey({
    publicKey: publicKey.toBytes(),
    signature: intentSignature,
    message: message,
  });

  const space = 200; // TODO: Compute this dynamically
  const systemInstruction = SystemProgram.createAccount({
    fromPubkey: SPONSOR,
    newAccountPubkey: sessionKey.publicKey,
    lamports:
      await provider.connection.getMinimumBalanceForRentExemption(space),
    space: space,
    programId: sessionManagerProgram.programId,
  });

  const transaction = new Transaction()
    .add(intentInstruction)
    .add(systemInstruction)
    .add(
      await sessionManagerProgram.methods
        .startSession()
        .accounts({ sponsor: SPONSOR, session: sessionKey.publicKey })
        .instruction(),
    );

  transaction.recentBlockhash = (
    await provider.connection.getLatestBlockhash()
  ).blockhash;
  transaction.feePayer = SPONSOR;
  transaction.partialSign(sessionKey);

  const response = await fetch("/api/sponsor_and_send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction: transaction
        .serialize({ requireAllSignatures: false })
        .toString("base64"),
    }),
  });

  const lastValidBlockHeight = await provider.connection.getSlot();
  const { signature } = await response.json();
  const confirmationResult = await provider.connection.confirmTransaction({
    signature,
    blockhash: transaction.recentBlockhash,
    lastValidBlockHeight,
  });
  const link = `https://explorer.fogo.io/tx/${signature}?cluster=custom&customUrl=${SOLANA_RPC}`;
  if (confirmationResult.value.err === null) {
    return { link, status: "success" };
  } else {
    return { link, status: "error" };
  }
};

export const Home = () => {
  const { connection } = useConnection();
  const [{ link, status }, setValues] = useState<{
    link: string | null;
    status: "success" | "error" | "loading" | null;
  }>({ link: null, status: null });

  const provider = new AnchorProvider(connection, {} as Wallet, {});

  const sessionManagerProgram: Program<SessionManager> =
    new Program<SessionManager>(sessionManagerIdl as SessionManager, provider);

  const { publicKey, signMessage } = useWallet();

  const onEnableTrading = useCallback(() => {
    if (signMessage && publicKey) {
      setValues({ link: null, status: "loading" });
      handleEnableTrading(sessionManagerProgram, publicKey, signMessage)
        .then(({ link, status }) => {
          setValues({ link, status });
        })
        .catch((error) => {
          setValues({ link: null, status: null });
          console.error(error);
        });
    }
  }, [publicKey, signMessage, sessionManagerProgram]);

  const canEnableTrading = publicKey && signMessage;
  return (
    <main>
      <div className="m-auto w-2/4 parent space-y-2">
        <h1>Gasless Trading App</h1>
        <WalletMultiButton />
        <WalletDisconnectButton />
        {canEnableTrading && (
          <Button onClick={onEnableTrading} loading={status === "loading"}>
            Enable Trading
          </Button>
        )}
        {link && status && (
          <a href={link} target="_blank" rel="noopener noreferrer">
            {status === "success"
              ? "✅ View Transaction"
              : "❌ Transaction Failed"}
          </a>
        )}
      </div>
    </main>
  );
};
