"use client";

import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { SessionManager } from "@fogo/sessions-idls";
import { SessionManagerIdl } from "@fogo/sessions-idls";
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
import "@solana/wallet-adapter-react-ui/styles.css";
import { sendTransaction } from "@/send-transaction";

const AIRDROP_AMOUNT_LAMPORTS = 5_000_000_000;

const handleEnableTrading = async (
  sponsorPubkey: PublicKey,
  solanaRpc: string,
  sessionManagerProgram: Program<SessionManager>,
  publicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
): Promise<
  | {
      link: string;
      status: "success";
      sessionKey: Keypair;
    }
  | {
      status: "failed";
      link: string;
    }
> => {
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
    AIRDROP_AMOUNT_LAMPORTS,
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

  const { link, status } = await sendTransaction(
    transaction,
    sponsorPubkey,
    solanaRpc,
    provider.connection,
    sessionKey,
  );
  return {
    link,
    status,
    sessionKey,
  };
};

export const EnableTradingButton = ({
  sponsorPubkey,
  solanaRpc,
  onTradingEnabled,
  provider,
}: {
  sponsorPubkey: string;
  solanaRpc: string;
  provider: AnchorProvider;
  onTradingEnabled: (sessionKey: Keypair | undefined) => void;
}) => {
  const [state, setState] = useState<
    | { status: "success" | "failed"; link: string }
    | { status: "error"; error: unknown }
    | { status: "loading" }
    | { status: "not-started" }
  >({ status: "not-started" });

  const sessionManagerProgram = useMemo(
    () =>
      new Program<SessionManager>(
        SessionManagerIdl as SessionManager,
        provider,
      ),
    [provider],
  );

  const { publicKey, signMessage } = useWallet();

  const onEnableTrading = useCallback(() => {
    if (signMessage && publicKey) {
      setState({ status: "loading" });
      handleEnableTrading(
        new PublicKey(sponsorPubkey),
        solanaRpc,
        sessionManagerProgram,
        publicKey,
        signMessage,
      )
        .then((result) => {
          setState(result);
          if (result.status === "success") {
            onTradingEnabled(result.sessionKey);
          } else {
            onTradingEnabled(undefined);
          }
        })
        .catch((error: unknown) => {
          setState({ status: "error", error });
          onTradingEnabled(undefined);
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
    onTradingEnabled,
  ]);

  const canEnableTrading = publicKey && signMessage;
  return (
    <>
      {canEnableTrading && (
        <Button onClick={onEnableTrading} loading={state.status === "loading"}>
          Enable Trading
        </Button>
      )}
      {(state.status === "success" || state.status === "failed") && (
        <a href={state.link} target="_blank" rel="noopener noreferrer">
          {state.status === "success"
            ? "✅ View Transaction"
            : "❌ Transaction Failed"}
        </a>
      )}
    </>
  );
};
