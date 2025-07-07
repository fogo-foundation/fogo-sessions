import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import { ExampleProgram } from "@fogo/sessions-idls";
import { TransactionResultType } from "@fogo/sessions-sdk";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import { getAssociatedTokenAddressSync, getMint } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import { useCallback } from "react";
import { mutate } from "swr";

import type { Transaction } from "./use-transaction-log";
import { useAsync } from "../../hooks/use-async";

export const useTrade = (
  sessionState: EstablishedSessionState,
  appendTransaction: (tx: Transaction) => void,
  amount: number,
  mint: PublicKey,
) => {
  const doTrade = useCallback(async () => {
    const sinkAta = getAssociatedTokenAddressSync(mint, sessionState.payer);
    const userTokenAccount = getAssociatedTokenAddressSync(
      mint,
      sessionState.walletPublicKey,
    );
    const { decimals } = await getMint(sessionState.connection, mint);

    const result = await sessionState.sendTransaction([
      await new ExampleProgram(
        new AnchorProvider(sessionState.connection, {} as Wallet, {}),
      ).methods
        .exampleTransfer(new BN(amount * Math.pow(10, decimals)))
        .accountsPartial({
          sessionKey: sessionState.sessionPublicKey,
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

    mutate(["tokenAccountData", sessionState.walletPublicKey.toBase58()]).catch(
      (error: unknown) => {
        // eslint-disable-next-line no-console
        console.error(error);
      },
    );

    return result;
  }, [sessionState, appendTransaction, amount, mint]);

  return useAsync(doTrade);
};
