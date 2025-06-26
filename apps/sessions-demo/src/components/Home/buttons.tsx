"use client";

import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { useConnection } from "@solana/wallet-adapter-react";
import type { Keypair } from "@solana/web3.js";
import { useMemo, useState } from "react";

import { EnableTradingButton } from "./enable-trading-button";
import { TradeButton } from "./trade-button";
import { useAddressLookupTable } from "@/hooks/useAddressLookupTable";

export const Buttons = (props: {
  sponsorPubkey: string;
  solanaRpc: string;
  addressLookupTableAddress: string | undefined;
}) => {
  const { connection } = useConnection();
  const provider = useMemo(
    () => new AnchorProvider(connection, {} as Wallet, {}),
    [connection],
  );
  const addressLookupTableState = useAddressLookupTable(props.addressLookupTableAddress) ;

  const [sessionKey, setSessionKey] = useState<Keypair | undefined>(undefined);

  return (
    <div className="flex flex-col">
      <EnableTradingButton
        {...props}
        provider={provider}
        addressLookupTableState={addressLookupTableState}
        onTradingEnabled={(sessionKey) => {
          setSessionKey(sessionKey);
        }}
      />
      <TradeButton {...props} provider={provider} sessionKey={sessionKey}
        addressLookupTableState={addressLookupTableState}
      />
    </div>
  );
};
