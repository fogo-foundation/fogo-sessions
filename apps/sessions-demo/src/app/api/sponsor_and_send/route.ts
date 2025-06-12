import { AnchorProvider } from "@coral-xyz/anchor";
import NodeWallet from "@coral-xyz/anchor/dist/cjs/nodewallet";
import { Connection, VersionedTransaction } from "@solana/web3.js";
import bs58 from "bs58";
import { z } from "zod";

import { SPONSOR_KEY, SOLANA_RPC } from "@/config/server";

const wallet = new NodeWallet(SPONSOR_KEY);
const provider = new AnchorProvider(new Connection(SOLANA_RPC), wallet, {});

export const POST = async (req: Request) => {
  const data = postBodySchema.parse(await req.json());
  try {
    const transaction = VersionedTransaction.deserialize(
      new Uint8Array(Buffer.from(data.transaction, "base64")),
    );
    const signedTransaction = await wallet.signTransaction(transaction);
    await provider.connection.sendRawTransaction(
      signedTransaction.serialize(),
      {
        skipPreflight: true,
      },
    );
    const signature = signedTransaction.signatures[0];
    return signature
      ? Response.json({
          signature: bs58.encode(signature),
        })
      : new Response("Signing by sponsor failed", { status: 500 });
  } catch {
    return new Response("Failed to deserialize transaction", { status: 400 });
  }
};

const postBodySchema = z.strictObject({
  transaction: z.string(),
});
