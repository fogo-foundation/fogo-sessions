import { TransactionResultType } from "@fogo/sessions-sdk";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
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
    const faucetAta = getAssociatedTokenAddressSync(mint, sessionState.payer);
    const userAta = getAssociatedTokenAddressSync(
      mint,
      sessionState.walletPublicKey,
    );
    const { decimals } = await getMint(sessionState.connection, mint);

    const result = await sessionState.sendTransaction([
      createAssociatedTokenAccountIdempotentInstruction(
        sessionState.payer,
        userAta,
        sessionState.walletPublicKey,
        mint,
      ),
      createTransferInstruction(
        faucetAta,
        userAta,
        sessionState.payer,
        amount * Math.pow(10, decimals),
      ),
    ]);

    appendTransaction({
      description: "Airdrop",
      signature: result.signature,
      success: result.type === TransactionResultType.Success,
    });

    return result;
  }, [sessionState, appendTransaction, amount, mint]);

  return useAsync(doAirdrop);
};
