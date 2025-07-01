import { fromLegacyKeypair } from "@solana/compat";
import type { Transaction, Rpc, SolanaRpcApi } from "@solana/kit";
import {
  signTransaction,
  createSolanaRpc,
  getBase64EncodedWireTransaction,
  getTransactionDecoder,
  getBase64Encoder,
  getSignatureFromTransaction,
} from "@solana/kit";
import { Keypair } from "@solana/web3.js";
import { z } from "zod";

export const sponsorAndSend = async (
  rpc: Rpc<SolanaRpcApi>,
  sponsor: CryptoKeyPair,
  transaction: Transaction,
) => {
  const signedTransaction = await signTransaction([sponsor], transaction);
  await rpc
    .sendTransaction(getBase64EncodedWireTransaction(signedTransaction), {
      encoding: "base64",
      skipPreflight: true,
    })
    .send();
  return getSignatureFromTransaction(signedTransaction);
};

export const createPaymasterEndpoint = async (options: {
  rpc: string;
  sponsor: Keypair;
}) => {
  const rpc = createSolanaRpc(options.rpc);
  const sponsor = await fromLegacyKeypair(options.sponsor);
  return async (req: Request) => {
    const data = postBodySchema.parse(await req.json());
    try {
      const transaction = getTransactionDecoder().decode(
        getBase64Encoder().encode(data.transaction),
      );
      try {
        return new Response(await sponsorAndSend(rpc, sponsor, transaction));
      } catch (error: unknown) {
        // eslint-disable-next-line no-console
        console.error(error);
        return new Response(
          `Failed to sponsor and send: ${serializeError(error)}`,
          { status: 500 },
        );
      }
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.error(error);
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
