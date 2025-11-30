import { TransactionResultType } from "@fogo/sessions-sdk";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import { SystemProgram } from "@solana/web3.js";
import { useCallback } from "react";

import type { Transaction } from "./use-transaction-log";
import { useAsync } from "../../hooks/use-async";

const LAMPORTS_PER_SOL = 1_000_000_000;

export const useTradeNative = (
  sessionState: EstablishedSessionState,
  appendTransaction: (tx: Transaction) => void,
  amount: number,
) => {
  const doTrade = useCallback(async () => {
    const result = await sessionState.sendTransaction(
      [
        SystemProgram.transfer({
          fromPubkey: sessionState.walletPublicKey,
          lamports: BigInt(amount * LAMPORTS_PER_SOL),
          toPubkey: sessionState.payer,
        }),
      ],
      {
        preprocessTransaction: sessionState.signTxWithWallet,
      },
    );

    appendTransaction({
      description: "Trade",
      signature: result.signature,
      success: result.type === TransactionResultType.Success,
    });

    return result;
  }, [sessionState, appendTransaction, amount]);

  return useAsync(doTrade);
};
