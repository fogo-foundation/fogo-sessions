"use client";

import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import type { Keypair } from "@solana/web3.js";
import { useMemo, useState } from "react";

import { EnableTradingButton } from "./enable-trading-button";
import { TradeButton } from "./trade-button";

export const Buttons = ({
  sponsorPubkey,
  solanaRpc,
}: {
  sponsorPubkey: string;
  solanaRpc: string;
}) => {
  const { connection } = useConnection();
  const provider = useMemo(
    () => new AnchorProvider(connection, {} as Wallet, {}),
    [connection],
  );
  const [sessionKey, setSessionKey] = useState<Keypair | undefined>(undefined);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <EnableTradingButton
        sponsorPubkey={sponsorPubkey}
        solanaRpc={solanaRpc}
        provider={provider}
        setSessionKey={setSessionKey}
      />
      <TradeButton
        sponsorPubkey={sponsorPubkey}
        solanaRpc={solanaRpc}
        provider={provider}
        sessionKey={sessionKey}
      />
    </div>
  );
};
