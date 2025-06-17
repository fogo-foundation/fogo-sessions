"use client";

import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  Ed25519Program,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useCallback, useState, useMemo } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import type { SessionManager } from "@/idl/session-manager";
import sessionManagerIdl from "@/idl/session-manager.json";

import "@solana/wallet-adapter-react-ui/styles.css";

const handleEnableTrading = async (
  sponsorPubkey: PublicKey,
  solanaRpc: string,
  sessionManagerProgram: Program<SessionManager>,
  publicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<{ link: string; status: "success" | "error" }> => {
  const provider = sessionManagerProgram.provider;
  const sessionKey = Keypair.generate();

  // TODO: This should be a function
  const message = new TextEncoder().encode(
    `Fogo Sessions:
Signing this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.

domain: gasless-trading.vercel.app
nonce: ${sessionKey.publicKey.toBase58()}
session_key: ${sessionKey.publicKey.toBase58()}
tokens:
-${NATIVE_MINT.toBase58()}: 100
extra: extra`,
  );

  const intentSignature = await signMessage(message);

  const intentInstruction = Ed25519Program.createInstructionWithPublicKey({
    publicKey: publicKey.toBytes(),
    signature: intentSignature,
    message: message,
  });

  const space = 200; // TODO: Compute this dynamically
  const systemInstruction = SystemProgram.createAccount({
    fromPubkey: sponsorPubkey,
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
        .accounts({ sponsor: sponsorPubkey, session: sessionKey.publicKey })
        .remainingAccounts([
          {
            pubkey: getAssociatedTokenAddressSync(NATIVE_MINT, publicKey),
            isWritable: true,
            isSigner: false,
          },
        ])
        .instruction(),
    );

  const { blockhash } = await provider.connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = sponsorPubkey;
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
  const { signature } = sponsorAndSendResultSchema.parse(await response.json());
  const confirmationResult = await provider.connection.confirmTransaction({
    signature,
    blockhash: transaction.recentBlockhash,
    lastValidBlockHeight,
  });
  const link = `https://explorer.fogo.io/tx/${signature}?cluster=custom&customUrl=${solanaRpc}`;
  return confirmationResult.value.err === null
    ? { link, status: "success" }
    : { link, status: "error" };
};

const sponsorAndSendResultSchema = z.strictObject({
  signature: z.string(),
});

export const EnableTradingButton = ({
  sponsorPubkey,
  solanaRpc,
}: {
  sponsorPubkey: string;
  solanaRpc: string;
}) => {
  const { connection } = useConnection();
  const [{ link, status }, setValues] = useState<{
    link: string | undefined;
    status: "success" | "error" | "loading" | undefined;
  }>({ link: undefined, status: undefined });

  const provider = useMemo(
    () => new AnchorProvider(connection, {} as Wallet, {}),
    [connection],
  );

  const sessionManagerProgram = useMemo(
    () =>
      new Program<SessionManager>(
        sessionManagerIdl as SessionManager,
        provider,
      ),
    [provider],
  );

  const { publicKey, signMessage } = useWallet();

  const onEnableTrading = useCallback(() => {
    if (signMessage && publicKey) {
      setValues({ link: undefined, status: "loading" });
      handleEnableTrading(
        new PublicKey(sponsorPubkey),
        solanaRpc,
        sessionManagerProgram,
        publicKey,
        signMessage,
      )
        .then(({ link, status }) => {
          setValues({ link, status });
        })
        .catch((error: unknown) => {
          setValues({ link: undefined, status: undefined });
          // eslint-disable-next-line no-console
          console.error(error);
        });
    }
  }, [publicKey, signMessage, sessionManagerProgram, sponsorPubkey, solanaRpc]);

  const canEnableTrading = publicKey && signMessage;
  return (
    <>
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
    </>
  );
};
