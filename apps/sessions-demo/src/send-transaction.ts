import type {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { z } from "zod";

const sponsorAndSendResultSchema = z.strictObject({
  signature: z.string(),
});

export async function sendTransaction(
  transaction: Transaction,
  sponsorPubkey: PublicKey,
  solanaRpc: string,
  connection: Connection,
  sessionKey: Keypair,
): Promise<{
  link: string;
  status: "success" | "error";
}> {
  const { blockhash } = await connection.getLatestBlockhash();
  transaction.recentBlockhash = blockhash;
  transaction.feePayer = sponsorPubkey;
  transaction.partialSign(sessionKey);

  const response = await fetch("/api/sponsor_and_send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction: transaction
        .serialize({ requireAllSignatures: false })
        .toString("base64"),
    }),
  });

  const lastValidBlockHeight = await connection.getSlot();
  const { signature } = sponsorAndSendResultSchema.parse(await response.json());
  const confirmationResult = await connection.confirmTransaction({
    signature,
    blockhash: transaction.recentBlockhash,
    lastValidBlockHeight,
  });
  const link = `https://explorer.fogo.io/tx/${signature}?cluster=custom&customUrl=${solanaRpc}`;

  return confirmationResult.value.err === null
    ? { link, status: "success" }
    : { link, status: "error" };
}
