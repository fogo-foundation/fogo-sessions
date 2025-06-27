"use client";

import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import type { Example } from "@fogo/sessions-idls";
import { ExampleIdl } from "@fogo/sessions-idls";
import {
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
} from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { AddressLookupTableAccount, Keypair, PublicKey } from "@solana/web3.js";
import { useCallback, useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import "@solana/wallet-adapter-react-ui/styles.css";
import type { State as AddressLookupTableState } from "@/hooks/use-address-lookup-table";
import { StateType as AddressLookupTableStateType } from "@/hooks/use-address-lookup-table";
import { sendTransaction } from "@/send-transaction";

const handleTrade = async (
  sponsorPubkey: PublicKey,
  solanaRpc: string,
  exampleProgram: Program<Example>,
  publicKey: PublicKey,
  sessionKey: Keypair,
  addressLookupTable: AddressLookupTableAccount | undefined,
): Promise<
  { link: string; status: "success" } | { status: "failed"; link: string }
> => {
  const provider = exampleProgram.provider;

  const sinkAta = getAssociatedTokenAddressSync(NATIVE_MINT, sponsorPubkey);
  const userTokenAccount = getAssociatedTokenAddressSync(
    NATIVE_MINT,
    publicKey,
  );

  // We are sending the connected wallet some assets so we can test the example transfer in the next instruction
  const transferInstruction = createTransferInstruction(
    sinkAta,
    userTokenAccount,
    sponsorPubkey,
    100,
  );

  const instructions = [
    transferInstruction,
    await exampleProgram.methods
      .exampleTransfer(new BN(100))
      .accounts({
        sessionKey: sessionKey.publicKey,
        sink: sinkAta,
        userTokenAccount: userTokenAccount,
      })
      .instruction(),
  ];

  return sendTransaction(
    instructions,
    sponsorPubkey,
    solanaRpc,
    provider.connection,
    sessionKey,
    addressLookupTable,
  );
};

export const TradeButton = ({
  sponsorPubkey,
  solanaRpc,
  provider,
  sessionKey,
  addressLookupTableState,
}: {
  sponsorPubkey: string;
  solanaRpc: string;
  provider: AnchorProvider;
  sessionKey: Keypair | undefined;
  addressLookupTableState: AddressLookupTableState;
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
    if (
      sessionKey &&
      publicKey &&
      addressLookupTableState.type == AddressLookupTableStateType.Complete
    ) {
      setState({ status: "loading" });
      handleTrade(
        new PublicKey(sponsorPubkey),
        solanaRpc,
        exampleProgram,
        publicKey,
        sessionKey,
        addressLookupTableState.addressLookupTable,
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
  }, [
    sponsorPubkey,
    solanaRpc,
    exampleProgram,
    publicKey,
    sessionKey,
    addressLookupTableState,
  ]);

  const canTrade =
    sessionKey !== undefined &&
    publicKey &&
    addressLookupTableState.type == AddressLookupTableStateType.Complete;
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
