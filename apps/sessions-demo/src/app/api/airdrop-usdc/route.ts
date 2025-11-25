import { createSessionConnection } from "@fogo/sessions-sdk";
import {
  createTransactionMessage,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  pipe,
  address,
  setTransactionMessageFeePayerSigner,
  sendTransactionWithoutConfirmingFactory,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction,
  createKeyPairSignerFromBytes,
} from "@solana/kit";
import {
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
  getCreateAssociatedTokenIdempotentInstruction,
  getMintToInstruction,
} from "@solana-program/token";
import { z } from "zod";

import { FAUCET_KEY, PROVIDER_CONFIG } from "../../../config/server";

const keyPairSchema = z.array(z.number());
const faucetSigner = FAUCET_KEY
  ? await createKeyPairSignerFromBytes(
      new Uint8Array(keyPairSchema.parse(JSON.parse(FAUCET_KEY))),
    )
  : undefined;

// USDC mint for localnet/testnet
const USDC_MINT = address("ELNbJ1RtERV2fjtuZjbTscDekWhVzkQ1LjmiPsxp5uND");

const postBodySchema = z.strictObject({
  address: z.string(),
});

export const POST = async (req: Request) => {
  const { rpc } = createSessionConnection(PROVIDER_CONFIG);

  if (!faucetSigner) {
    return new Response("Faucet unavailable: no faucet key provided", {
      status: 500,
    });
  }

  const userAddress = address(postBodySchema.parse(await req.json()).address);

  const [userAta] = await findAssociatedTokenPda({
    owner: userAddress,
    mint: USDC_MINT,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const instructions = [
    getCreateAssociatedTokenIdempotentInstruction({
      payer: faucetSigner,
      owner: userAddress,
      mint: USDC_MINT,
      ata: userAta,
    }),
    getMintToInstruction({
      mint: USDC_MINT,
      token: userAta,
      mintAuthority: faucetSigner,
      amount: 100_000_000n,
    }),
  ];

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const sendTransaction = sendTransactionWithoutConfirmingFactory({
    rpc,
  });

  const signature = await pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(faucetSigner, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions(instructions, tx),
    (tx) => signTransactionMessageWithSigners(tx),
    async (signedTxPromise) => {
      const signedTx = await signedTxPromise;
      await sendTransaction(signedTx, { commitment: "processed" });
      return getSignatureFromTransaction(signedTx);
    },
  );

  return new Response(signature);
};
