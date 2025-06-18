"use client";

import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { useCallback, useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import "@solana/wallet-adapter-react-ui/styles.css";
import type { Example } from "@/idl/example";
import exampleIdl from "@/idl/example.json";
import { sendTransaction } from "@/send-transaction";

const handleTrade = async (
  sponsorPubkey: PublicKey,
  solanaRpc: string,
  exampleProgram: Program<Example>,
  publicKey: PublicKey,
  sessionKey: Keypair,
): Promise<{ link: string; status: "success" | "error" }> => {
  const provider = exampleProgram.provider;

  const sinkAta = getAssociatedTokenAddressSync(NATIVE_MINT, sponsorPubkey);
  const userTokenAccount = getAssociatedTokenAddressSync(
    NATIVE_MINT,
    publicKey,
  );

  const transaction = new Transaction().add(
    await exampleProgram.methods
      .exampleTransfer(new BN(100))
      .accounts({
        sessionKey: sessionKey.publicKey,
        sink: sinkAta,
        userTokenAccount: userTokenAccount,
      })
      .instruction(),
  );

  return sendTransaction(
    transaction,
    sponsorPubkey,
    solanaRpc,
    provider.connection,
    sessionKey,
  );
};

export const TradeButton = ({
  sponsorPubkey,
  solanaRpc,
  provider,
  sessionKey,
}: {
  sponsorPubkey: string;
  solanaRpc: string;
  provider: AnchorProvider;
  sessionKey: Keypair | undefined;
}) => {
  const [{ link, status }, setValues] = useState<{
    link: string | undefined;
    status: "success" | "error" | "loading" | undefined;
  }>({ link: undefined, status: undefined });

  const exampleProgram = useMemo(
    () => new Program<Example>(exampleIdl as Example, provider),
    [provider],
  );

  const { publicKey } = useWallet();

  const onTrade = useCallback(() => {
    if (sessionKey && publicKey) {
      setValues({ link: undefined, status: "loading" });
      handleTrade(
        new PublicKey(sponsorPubkey),
        solanaRpc,
        exampleProgram,
        publicKey,
        sessionKey,
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
  }, [sponsorPubkey, solanaRpc, exampleProgram, publicKey, sessionKey]);

  const canTrade = sessionKey !== undefined && publicKey;
  return (
    <>
      {canTrade && (
        <Button onClick={onTrade} loading={status === "loading"}>
          Trade
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
