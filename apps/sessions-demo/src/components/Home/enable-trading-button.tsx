"use client";

import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey } from "@solana/web3.js";
import { useCallback, useState, useMemo } from "react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import type { SessionManager } from "@/idl/session-manager";
import sessionManagerIdl from "@/idl/session-manager.json";

import "@solana/wallet-adapter-react-ui/styles.css";

const handleEnableTrading = async (
  sponsorPubkey: PublicKey,
  sessionManagerProgram: Program<SessionManager>,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  setLoading: (loading: boolean) => void,
) => {
  setLoading(true);
  const provider = sessionManagerProgram.provider;
  const sessionKey = Keypair.generate();

  const transaction = await sessionManagerProgram.methods
    .start()
    .accounts({
      sponsor: sponsorPubkey,
    })
    .transaction();

  await signMessage(
    new TextEncoder().encode(`
      session_key: ${sessionKey.publicKey.toBase58()}
      nonce: ${Math.floor(Date.now() / 1000).toString()}
      domain: gasless-trading.vercel.app
    `),
  );

  const { blockhash } = await provider.connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = sponsorPubkey;

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
  await provider.connection.confirmTransaction({
    signature,
    blockhash: transaction.recentBlockhash,
    lastValidBlockHeight,
  });
  setLoading(false);
};

const sponsorAndSendResultSchema = z.strictObject({
  signature: z.string(),
});

export const EnableTradingButton = ({
  sponsorPubkey,
}: {
  sponsorPubkey: string;
}) => {
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);

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
    if (signMessage) {
      handleEnableTrading(
        new PublicKey(sponsorPubkey),
        sessionManagerProgram,
        signMessage,
        setLoading,
      ).catch((error: unknown) => {
        setLoading(false);
        // eslint-disable-next-line no-console
        console.error(error);
      });
    }
  }, [signMessage, sessionManagerProgram, sponsorPubkey]);

  const canEnableTrading = publicKey && signMessage;
  return (
    canEnableTrading && (
      <Button onClick={onEnableTrading} loading={loading}>
        Enable Trading
      </Button>
    )
  );
};
