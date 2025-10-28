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
  getTransferInstruction,
} from "@solana-program/token";
import { z } from "zod";

import { FAUCET_KEY, PROVIDER_CONFIG } from "../../../config/server";

const keyPairSchema = z.array(z.number());
const faucetSigner = FAUCET_KEY
  ? await createKeyPairSignerFromBytes(
      new Uint8Array(keyPairSchema.parse(JSON.parse(FAUCET_KEY))),
    )
  : undefined;

const NATIVE_MINT = address("So11111111111111111111111111111111111111112");

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

  const faucetAddress = faucetSigner.address;
  const userAddress = address(postBodySchema.parse(await req.json()).address);

  const [[userAta], [faucetAta]] = await Promise.all(
    [userAddress, faucetAddress].map((owner) =>
      findAssociatedTokenPda({
        owner,
        mint: NATIVE_MINT,
        tokenProgram: TOKEN_PROGRAM_ADDRESS,
      }),
    ) as [
      ReturnType<typeof findAssociatedTokenPda>,
      ReturnType<typeof findAssociatedTokenPda>,
    ],
  );

  const instructions = [
    getCreateAssociatedTokenIdempotentInstruction({
      payer: faucetSigner,
      owner: userAddress,
      mint: NATIVE_MINT,
      ata: userAta,
    }),
    getTransferInstruction({
      source: faucetAta,
      destination: userAta,
      authority: faucetSigner,
      amount: 1_000_000_000n,
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
