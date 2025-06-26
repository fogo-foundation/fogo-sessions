import type {
  AddressLookupTableAccount,
  Connection,
  Keypair,
} from "@solana/web3.js";
import {
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { z } from "zod";

const sponsorAndSendResultSchema = z.strictObject({
  signature: z.string(),
});

export async function sendTransaction(
  transactionInstructions: TransactionInstruction[],
  sponsorPubkey: PublicKey,
  solanaRpc: string,
  connection: Connection,
  sessionKey: Keypair,
  addressLookupTable: AddressLookupTableAccount | undefined,
): Promise<{
  link: string;
  status: "success" | "failed";
}> {
  const { blockhash } = await connection.getLatestBlockhash();

  const transaction = new VersionedTransaction(
    new TransactionMessage({
      payerKey: sponsorPubkey,
      recentBlockhash: blockhash,
      instructions: transactionInstructions,
    }).compileToV0Message(addressLookupTable ? [addressLookupTable] : []),
  );

  transaction.sign([sessionKey]);

  const response = await fetch("/api/sponsor_and_send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction: Buffer.from(transaction.serialize()).toString("base64"),
    }),
  });

  const lastValidBlockHeight = await connection.getSlot();
  const { signature } = sponsorAndSendResultSchema.parse(await response.json());
  const confirmationResult = await connection.confirmTransaction({
    signature,
    blockhash,
    lastValidBlockHeight,
  });
  const link = `https://explorer.fogo.io/tx/${signature}?cluster=custom&customUrl=${solanaRpc}`;

  return confirmationResult.value.err === null
    ? { link, status: "success" }
    : { link, status: "failed" };
}
