import type { Session } from "@fogo/sessions-sdk";
import { TransactionResultType } from "@fogo/sessions-sdk";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useCallback } from "react";
import { mutate } from "swr";

import type { Transaction } from "./use-transaction-log";
import { useAsync } from "../../hooks/use-async";

export const useAirdrop = (
  session: Session,
  appendTransaction: (tx: Transaction) => void,
  amount: number,
  mint: PublicKey,
) => {
  const { connection } = useConnection();

  const doAirdrop = useCallback(async () => {
    const faucetAta = getAssociatedTokenAddressSync(mint, session.payer);
    const userAta = getAssociatedTokenAddressSync(mint, session.publicKey);
    const { decimals } = await getMint(connection, mint);

    const result = await session.sendTransaction([
      createAssociatedTokenAccountIdempotentInstruction(
        session.payer,
        userAta,
        session.publicKey,
        mint,
      ),
      createTransferInstruction(
        faucetAta,
        userAta,
        session.payer,
        amount * Math.pow(10, decimals),
      ),
    ]);

    appendTransaction({
      description: "Airdrop",
      signature: result.signature,
      success: result.type === TransactionResultType.Success,
    });

    mutate(["tokenAccountData", session.publicKey.toBase58()]).catch(
      (error: unknown) => {
        // eslint-disable-next-line no-console
        console.error(error);
      },
    );

    return result;
  }, [session, appendTransaction, amount, connection, mint]);

  return useAsync(doAirdrop);
};
