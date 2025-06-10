"use client";

import { Button } from "@/components/ui/button";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import "@solana/wallet-adapter-react-ui/styles.css";
import {
  WalletDisconnectButton,
  WalletMultiButton,
} from "@/components/WalletButton";
import { Keypair, PublicKey } from "@solana/web3.js";
import { useCallback, useState } from "react";
import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import sessionManagerIdl from "@/idl/session_manager.json";
import type { SessionManager } from "@/idl/session_manager";

const SPONSOR = new PublicKey(process.env.NEXT_PUBLIC_SPONSOR_KEY!);

const handleEnableTrading = async (
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
        sponsor: SPONSOR,
      })
      .transaction();

    await signMessage!(
      new TextEncoder().encode(`
      chain_id: ${process.env.NEXT_PUBLIC_CHAIN_ID}
      session_key: ${sessionKey.publicKey.toBase58()}
      nonce: ${Math.floor(Date.now() / 1000)}
      domain: gasless-trading.vercel.app
    `),
    );

    transaction.recentBlockhash = (
      await provider.connection.getLatestBlockhash()
    ).blockhash;
    transaction.feePayer = SPONSOR;

    const response = await fetch("/api/sponsor_and_send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({transaction:
        transaction.serialize({ requireAllSignatures: false }).toString("base64"),
    }),
    });

    const lastValidBlockHeight = await provider.connection.getSlot();
    const { signature } = await response.json();
    await provider.connection.confirmTransaction({
      signature,
      blockhash: transaction.recentBlockhash,
      lastValidBlockHeight,
    });
    setLoading(false);
};

export const Home = () => {
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);

  const provider = new AnchorProvider(connection, {} as Wallet, {});

  const sessionManagerProgram: Program<SessionManager> =
    new Program<SessionManager>(sessionManagerIdl as SessionManager, provider);

  const { publicKey, signMessage } = useWallet();

  const onEnableTrading = useCallback(() => {
    if (signMessage) {
      handleEnableTrading(sessionManagerProgram, signMessage, setLoading).catch((error) => {
        setLoading(false);
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
          <Button onClick={onEnableTrading} loading={loading}>
            Enable Trading
          </Button>
        )}
      </div>
    </main>
  );
}
