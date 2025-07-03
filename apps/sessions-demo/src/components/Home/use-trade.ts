import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import { ExampleProgram } from "@fogo/sessions-idls";
import type { Session } from "@fogo/sessions-sdk";
import { TransactionResultType } from "@fogo/sessions-sdk";
import { getAssociatedTokenAddressSync, getMint } from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback } from "react";
import { mutate } from "swr";

import type { Transaction } from "./use-transaction-log";
import { useAsync } from "../../hooks/use-async";

export const useTrade = (
  session: Session,
  appendTransaction: (tx: Transaction) => void,
  amount: number,
  mint: PublicKey,
) => {
  const { connection } = useConnection();

  const doTrade = useCallback(async () => {
    const sinkAta = getAssociatedTokenAddressSync(mint, session.payer);
    const userTokenAccount = getAssociatedTokenAddressSync(
      mint,
      session.walletPublicKey,
    );
    const { decimals } = await getMint(connection, mint);

    const result = await session.sendTransaction([
      await new ExampleProgram(
        new AnchorProvider(connection, {} as Wallet, {}),
      ).methods
        .exampleTransfer(new BN(amount * Math.pow(10, decimals)))
        .accountsPartial({
          sessionKey: session.sessionPublicKey,
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

    mutate(["tokenAccountData", session.walletPublicKey.toBase58()]).catch(
      (error: unknown) => {
        // eslint-disable-next-line no-console
        console.error(error);
      },
    );

    return result;
  }, [connection, session, appendTransaction, amount, mint]);

  return useAsync(doTrade);
};
