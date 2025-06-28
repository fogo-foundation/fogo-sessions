import { VersionedTransaction, Connection, Keypair } from "@solana/web3.js";
import bs58 from "bs58";
import { z } from "zod";

export const sponsorAndSend = async (
  connection: Connection,
  sponsor: Keypair,
  transaction: VersionedTransaction,
) => {
  transaction.sign([sponsor]);
  const signature = transaction.signatures[0];
  if (signature === undefined) {
    throw new Error("Sponsor failed to sign transaction");
  } else {
    await connection.sendRawTransaction(transaction.serialize(), {
      skipPreflight: true,
    });
    return signature;
  }
};

export const createPaymasterEndpoint = (options: {
  rpc: string;
  sponsor: Keypair;
}) => {
  const connection = new Connection(options.rpc);

  return async (req: Request) => {
    const data = postBodySchema.parse(await req.json());
    try {
      const transaction = VersionedTransaction.deserialize(
        new Uint8Array(Buffer.from(data.transaction, "base64")),
      );
      try {
        const signature = await sponsorAndSend(
          connection,
          options.sponsor,
          transaction,
        );
        return new Response(bs58.encode(signature));
      } catch (error: unknown) {
        return new Response(
          `Failed to sponsor and send: ${serializeError(error)}`,
          { status: 500 },
        );
      }
    } catch {
      return new Response("Failed to deserialize transaction", { status: 400 });
    }
  };
};

const postBodySchema = z.strictObject({
  transaction: z.string(),
});

const serializeError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message;
  } else if (typeof error === "string") {
    return error.toString();
  } else {
    return "Unknown Error";
  }
};
