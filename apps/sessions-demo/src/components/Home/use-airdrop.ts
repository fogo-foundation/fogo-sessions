import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback } from "react";

import type { Transaction } from "./use-transaction-log";
import { useAsync } from "../../hooks/use-async";

export const useAirdrop = (
  sessionState: EstablishedSessionState,
  appendTransaction: (tx: Transaction) => void,
  amount: number,
  mint: PublicKey,
) => {
  const doAirdrop = useCallback(async () => {
    const response = await fetch("/api/airdrop", {
      method: "POST",
      body: JSON.stringify({ address: sessionState.walletPublicKey }),
    });

    const signature = await response.text();

    if (response.status !== 200) {
      appendTransaction({
        description: "Airdrop",
        signature: "",
        success: false,
      });
    }

    appendTransaction({
      description: "Airdrop",
      signature,
      success: true,
    });

    return true;
  }, [sessionState, appendTransaction, amount, mint]);

  return useAsync(doAirdrop);
};
