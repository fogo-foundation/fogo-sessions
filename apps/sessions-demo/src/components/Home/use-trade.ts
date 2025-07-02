import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import { ExampleProgram } from "@fogo/sessions-idls";
import type { Session } from "@fogo/sessions-sdk";
import { TransactionResultType } from "@fogo/sessions-sdk";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  NATIVE_MINT,
} from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { useCallback } from "react";

import type { Transaction } from "./use-transaction-log";
import { useAsync } from "../../hooks/use-async";

export const useTrade = (
  session: Session,
  appendTransaction: (tx: Transaction) => void,
) => {
  const { connection } = useConnection();

  const doTrade = useCallback(async () => {
    const [sinkAta, userTokenAccount] = await Promise.all([
      getAssociatedTokenAddress(NATIVE_MINT, session.payer),
      getAssociatedTokenAddress(NATIVE_MINT, session.publicKey),
    ]);

    // We are sending the connected wallet some assets so we can test the example transfer in the next instruction
    const transferInstruction = createTransferInstruction(
      sinkAta,
      userTokenAccount,
      session.payer,
      100,
    );

    const result = await session.sendTransaction([
      transferInstruction,
      await new ExampleProgram(
        new AnchorProvider(connection, {} as Wallet, {}),
      ).methods
        .exampleTransfer(new BN(100))
        .accountsPartial({
          sessionKey: session.sessionPublicKey,
          sink: sinkAta,
          userTokenAccount: userTokenAccount,
          mint: NATIVE_MINT
        })
        .instruction(),
    ]);

    appendTransaction({
      description: "Trade",
      signature: result.signature,
      success: result.type === TransactionResultType.Success,
    });

    return result;
  }, [connection, session, appendTransaction]);

  return useAsync(doTrade);
};
