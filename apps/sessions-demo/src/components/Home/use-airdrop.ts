import { TransactionResultType } from "@fogo/sessions-sdk";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import { useCallback } from "react";

import type { Transaction } from "./use-transaction-log";
import { useAsync } from "../../hooks/use-async";

export const useAirdrop = (
  sessionState: EstablishedSessionState,
  appendTransaction: (tx: Transaction) => void,
) => {
  const doAirdrop = useCallback(async () => {
    const response = await fetch("/api/airdrop", {
      method: "POST",
      body: JSON.stringify({ address: sessionState.walletPublicKey }),
    });

    const signature = await response.text();
    appendTransaction({
      description: "Airdrop",
      signature,
      success: true,
    });

    return {
      type: TransactionResultType.Success as const,
      signature,
    };
  }, [sessionState, appendTransaction]);

  return useAsync(doAirdrop);
};
