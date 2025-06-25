"use client";

import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import type { Example } from "@fogo/sessions-idls";
import { ExampleIdl } from "@fogo/sessions-idls";
import { createTransferInstruction, getAssociatedTokenAddressSync, NATIVE_MINT } from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { Keypair, PublicKey, Transaction } from "@solana/web3.js";
import { useCallback, useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import "@solana/wallet-adapter-react-ui/styles.css";
import { sendTransaction } from "@/send-transaction";

const handleTrade = async (
  sponsorPubkey: PublicKey,
  solanaRpc: string,
  exampleProgram: Program<Example>,
  publicKey: PublicKey,
  sessionKey: Keypair,
  addressLookupTableAddress: string | undefined,
): Promise<
  { link: string; status: "success" } | { status: "failed"; link: string }
> => {
  const provider = exampleProgram.provider;

  const sinkAta = getAssociatedTokenAddressSync(NATIVE_MINT, sponsorPubkey);
  const userTokenAccount = getAssociatedTokenAddressSync(
    NATIVE_MINT,
    publicKey,
  );

 // We are sending the connected wallet some assets to play with in this demo
  const transferInstruction = createTransferInstruction(
    sinkAta,
    userTokenAccount,
    sponsorPubkey,
    100,
  );

  const transaction = new Transaction().add(transferInstruction).add(
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
    transaction.instructions,
    sponsorPubkey,
    solanaRpc,
    provider.connection,
    sessionKey,
    addressLookupTableAddress,
  );
};

export const TradeButton = ({
  sponsorPubkey,
  solanaRpc,
  provider,
  sessionKey,
  addressLookupTableAddress,
}: {
  sponsorPubkey: string;
  solanaRpc: string;
  provider: AnchorProvider;
  sessionKey: Keypair | undefined;
  addressLookupTableAddress: string | undefined;
}) => {
  const [state, setState] = useState<
    | { status: "success" | "failed"; link: string }
    | { status: "error"; error: unknown }
    | { status: "loading" }
    | { status: "not-started" }
  >({ status: "not-started" });

  const exampleProgram = useMemo(
    () => new Program<Example>(ExampleIdl as Example, provider),
    [provider],
  );

  const { publicKey } = useWallet();

  const onTrade = useCallback(() => {
    if (sessionKey && publicKey) {
      setState({ status: "loading" });
      handleTrade(
        new PublicKey(sponsorPubkey),
        solanaRpc,
        exampleProgram,
        publicKey,
        sessionKey,
        addressLookupTableAddress,
      )
        .then((result) => {
          setState(result);
        })
        .catch((error: unknown) => {
          setState({ status: "error", error });
          // eslint-disable-next-line no-console
          console.error(error);
        });
    }
  }, [sponsorPubkey, solanaRpc, exampleProgram, publicKey, sessionKey]);

  const canTrade = sessionKey !== undefined && publicKey;
  return (
    <>
      {canTrade && (
        <Button onClick={onTrade} loading={state.status === "loading"}>
          Trade
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
