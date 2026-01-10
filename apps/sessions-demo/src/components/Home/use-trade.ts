import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import { ExampleProgram } from "@fogo/sessions-idls";
import { TransactionResultType } from "@fogo/sessions-sdk";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import { useConnection } from "@fogo/sessions-sdk-react";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { useCallback } from "react";

import type { Transaction } from "./use-transaction-log";
import { useAsync } from "../../hooks/use-async";

export const useTrade = (
  sessionState: EstablishedSessionState,
  appendTransaction: (tx: Transaction) => void,
  amount: number,
  mint: PublicKey,
) => {
  const connection = useConnection();
  const doTrade = useCallback(async () => {
    const sinkAta = getAssociatedTokenAddressSync(mint, sessionState.payer);
    const userTokenAccount = getAssociatedTokenAddressSync(
      mint,
      sessionState.walletPublicKey,
    );
    const { decimals } = await getMint(connection, mint);

    const result = await sessionState.sendTransaction([
      createAssociatedTokenAccountIdempotentInstruction(
        sessionState.payer,
        sinkAta,
        sessionState.payer,
        mint,
      ),
      await new ExampleProgram(
        new AnchorProvider(connection, {} as Wallet, {}),
      ).methods
        .exampleTransfer(new BN(amount * Math.pow(10, decimals)))
        .accountsPartial({
          signerOrSession: sessionState.sessionPublicKey,
          sink: sinkAta,
          userTokenAccount,
          mint,
        })
        .instruction(),
    ]);

    appendTransaction({
      description: "Trade",
      signature: result.signature,
      success: result.type === TransactionResultType.Success,
    });

    return result;
  }, [connection, sessionState, appendTransaction, amount, mint]);

  return useAsync(doTrade);
};
