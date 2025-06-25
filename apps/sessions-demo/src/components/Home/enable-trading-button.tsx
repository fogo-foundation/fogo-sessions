"use client";

import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { SessionManager } from "@fogo/sessions-idls";
import { SessionManagerIdl } from "@fogo/sessions-idls";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
} from "@solana/spl-token";
import { useWallet } from "@solana/wallet-adapter-react";
import { Ed25519Program, Keypair, PublicKey } from "@solana/web3.js";
import { useCallback, useState, useMemo } from "react";

import { Button } from "@/components/ui/button";
import "@solana/wallet-adapter-react-ui/styles.css";
import { sendTransaction } from "@/send-transaction";
import { fetchMetadata, findMetadataPda } from "@metaplex-foundation/mpl-token-metadata";
import { publicKey as metaplexPublicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";

const handleEnableTrading = async (
  sponsorPubkey: PublicKey,
  solanaRpc: string,
  sessionManagerProgram: Program<SessionManager>,
  publicKey: PublicKey,
  signMessage: (message: Uint8Array) => Promise<Uint8Array>,
  addressLookupTableAddress: string | undefined,
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

  const umi = createUmi(solanaRpc);
  const metaplexNativeMint = metaplexPublicKey(NATIVE_MINT.toBase58());

  console.log(findMetadataPda(umi, {mint: metaplexPublicKey("HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3")}))
  
  const metadataAddress = findMetadataPda(umi, {mint: metaplexNativeMint})[0];
  const metadata = await fetchMetadata(umi, metadataAddress);

  const sessionKey = Keypair.generate();
  console.log(metadata);
  // TODO: This should be a function
  const message = new TextEncoder().encode(
    `Fogo Sessions:
Signing this intent will allow this app to interact with your on-chain balances. Please make sure you trust this app and the domain in the message matches the domain of the current web application.

domain: gasless-trading.vercel.app
nonce: ${sessionKey.publicKey.toBase58()}
session_key: ${sessionKey.publicKey.toBase58()}
tokens:
-${metadata.symbol}: 100`,
);

  const intentSignature = await signMessage(message);

  const intentInstruction = Ed25519Program.createInstructionWithPublicKey({
    publicKey: publicKey.toBytes(),
    signature: intentSignature,
    message: message,
  });

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

  const instructions = [
    intentInstruction,
    createAssociatedTokenAccountInstruction,
    await sessionManagerProgram.methods
      .startSession()
      .accounts({ sponsor: sponsorPubkey, session: sessionKey.publicKey })
      .remainingAccounts([
        {
          pubkey: getAssociatedTokenAddressSync(NATIVE_MINT, publicKey),
          isWritable: true,
          isSigner: false,
        },
        {
          pubkey: NATIVE_MINT,
          isWritable: false,
          isSigner: false,
        },
        {
          pubkey: new PublicKey(findMetadataPda(umi, {mint: metaplexNativeMint})[0]),
          isWritable: false,
          isSigner: false,
        },
      ])
      .instruction(),
  ];

  const { link, status } = await sendTransaction(
    instructions,
    sponsorPubkey,
    solanaRpc,
    provider.connection,
    sessionKey,
    addressLookupTableAddress,
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
  addressLookupTableAddress,
}: {
  sponsorPubkey: string;
  solanaRpc: string;
  provider: AnchorProvider;
  onTradingEnabled: (sessionKey: Keypair | undefined) => void;
  addressLookupTableAddress: string | undefined;
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
        addressLookupTableAddress,
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
    addressLookupTableAddress,
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
