import {
  createTransactionMessage,
  setTransactionMessageLifetimeUsingBlockhash,
  appendTransactionMessageInstructions,
  pipe,
  createSolanaRpc,
  address,
  setTransactionMessageFeePayerSigner,
  sendTransactionWithoutConfirmingFactory,
  signTransactionMessageWithSigners,
  getSignatureFromTransaction,
} from "@solana/kit";
import {
  findAssociatedTokenPda,
  TOKEN_PROGRAM_ADDRESS,
  getCreateAssociatedTokenIdempotentInstruction,
  getTransferInstruction,
} from "@solana-program/token";
import z from "zod";

import { FAUCET_SIGNER, RPC } from "../../../config/server";

const NATIVE_MINT = address("So11111111111111111111111111111111111111112");

const postBodySchema = z.strictObject({
  address: z.string(),
});

export const POST = async (req: Request) => {
  const rpc = createSolanaRpc(RPC);
  const faucetAddress = FAUCET_SIGNER.address;
  const userAddress = address(postBodySchema.parse(await req.json()).address);

  const [userAta] = await findAssociatedTokenPda({
    owner: userAddress,
    mint: NATIVE_MINT,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });
  const [faucetAta] = await findAssociatedTokenPda({
    owner: faucetAddress,
    mint: NATIVE_MINT,
    tokenProgram: TOKEN_PROGRAM_ADDRESS,
  });

  const instructions = [
    getCreateAssociatedTokenIdempotentInstruction({
      payer: FAUCET_SIGNER,
      owner: userAddress,
      mint: NATIVE_MINT,
      ata: userAta,
    }),
    getTransferInstruction({
      source: faucetAta,
      destination: userAta,
      authority: FAUCET_SIGNER,
      amount: 1_000_000_000n,
    }),
  ];

  const { value: latestBlockhash } = await rpc.getLatestBlockhash().send();
  const sendTransaction = sendTransactionWithoutConfirmingFactory({
    rpc,
  });

  const signature = await pipe(
    createTransactionMessage({ version: 0 }),
    (tx) => setTransactionMessageFeePayerSigner(FAUCET_SIGNER, tx),
    (tx) => setTransactionMessageLifetimeUsingBlockhash(latestBlockhash, tx),
    (tx) => appendTransactionMessageInstructions(instructions, tx),
    (tx) => signTransactionMessageWithSigners(tx),
    async (tx) => {
      return await tx.then((tx) =>
        sendTransaction(tx, { commitment: "processed" }).then(() =>
          getSignatureFromTransaction(tx),
        ),
      );
    },
  );

  return new Response(signature);
};
