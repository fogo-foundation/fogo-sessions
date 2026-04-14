import { TransactionResultType } from "@fogo/sessions-sdk";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import { useCallback } from "react";
import { useAsync } from "../../hooks/use-async";
import type { Transaction } from "./use-transaction-log";

export const useAirdrop = (
  sessionState: EstablishedSessionState,
  appendTransaction: (tx: Transaction) => void,
) => {
  const doAirdrop = useCallback(async () => {
    const response = await fetch("/api/airdrop", {
      body: JSON.stringify({ address: sessionState.walletPublicKey }),
      method: "POST",
    });

    const signature = await response.text();
    appendTransaction({
      description: "Airdrop",
      signature,
      success: true,
    });

    return {
      signature,
      type: TransactionResultType.Success as const,
    };
  }, [sessionState, appendTransaction]);

  return useAsync(doAirdrop);
};
