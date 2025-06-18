"use client";

import { AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
} from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  Ed25519Program,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { useCallback, useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import type { SessionManager } from "@/idl/session-manager";
import sessionManagerIdl from "@/idl/session-manager.json";
import "@solana/wallet-adapter-react-ui/styles.css";
import { sendTransaction } from "@/send-transaction";

const handleEnableTrading = async (
  sponsorPubkey: PublicKey,
  solanaRpc: string,
  sessionManagerProgram: Program<SessionManager>,
  publicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<{
  link: string;
  status: "success" | "error";
  sessionKey: Keypair | undefined;
}> => {
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

  const faucetAta = getAssociatedTokenAddressSync(NATIVE_MINT, sponsorPubkey);
  const userTokenAccount = getAssociatedTokenAddressSync(
    NATIVE_MINT,
    publicKey,
  );

  const createAssociatedTokenAccountInstruction =
    createAssociatedTokenAccountIdempotentInstruction(
      sponsorPubkey,
      userTokenAccount,
      publicKey,
      NATIVE_MINT,
    );

  // We are sending the connected wallet some assets to play with in this demo
  const transferInstruction = createTransferInstruction(
    faucetAta,
    userTokenAccount,
    sponsorPubkey,
    5_000_000_000,
  );

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
    .add(createAssociatedTokenAccountInstruction)
    .add(transferInstruction)
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

  const { link, status } = await sendTransaction(transaction, sponsorPubkey, solanaRpc, provider.connection, sessionKey);
  return { link, status, sessionKey: status=="success"? sessionKey: undefined };
};

export const EnableTradingButton = ({
  sponsorPubkey,
  solanaRpc,
  setSessionKey,
  provider,
}: {
  sponsorPubkey: string;
  solanaRpc: string;
  provider: AnchorProvider;
  setSessionKey: (sessionKey: Keypair | undefined) => void;
}) => {
  const [{ link, status }, setValues] = useState<{
    link: string | undefined;
    status: "success" | "error" | "loading" | undefined;
  }>({ link: undefined, status: undefined });

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
        .then(({ link, status, sessionKey }) => {
          setValues({ link, status });
          setSessionKey(sessionKey);
        })
        .catch((error: unknown) => {
          setValues({ link: undefined, status: undefined });
          setSessionKey(undefined);
          // eslint-disable-next-line no-console
          console.error(error);
        });
    }
  }, [
    publicKey,
    signMessage,
    sessionManagerProgram,
    sponsorPubkey,
    solanaRpc,
    setSessionKey,
  ]);

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
