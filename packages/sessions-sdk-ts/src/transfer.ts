import { fromLegacyPublicKey } from "@solana/compat";
import { PublicKey } from "@solana/web3.js";

import { getTransferFee } from "./bridge.js";
import type { SessionContext } from "./context.js";
import { SESSIONS_INTERNAL_PAYMASTER_DOMAIN } from "./context.js";
import { usdcDecimals, chainIdToUsdcMint } from "./onchain/constants.js";
import { composeIntraChainIntentTransferIxs } from "./onchain/intent-transfer.js";
import type { SigningFunc } from "./onchain/svm-intent.js";

type SendTransferOptions = {
  context: SessionContext;
  walletPublicKey: PublicKey;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  mint: PublicKey;
  amount: bigint;
  recipient: PublicKey;
  feeConfig: Awaited<ReturnType<typeof getTransferFee>>;
};

export async function sendTransfer(options: SendTransferOptions) {
  const { context, walletPublicKey, signMessage } = options;
  const { amount, recipient, mint, feeConfig } = options;

  const chainId = context.chainId;
  return context.sendTransaction(
    undefined,
    await composeIntraChainIntentTransferIxs(
      context.rpc,
      signMessage as SigningFunc,
      amount,
      {
        user:      fromLegacyPublicKey(walletPublicKey),
        sponsor:   fromLegacyPublicKey(context.internalPayer),
        recipient: fromLegacyPublicKey(recipient),
        mint:      fromLegacyPublicKey(mint),
        feeMint:   chainIdToUsdcMint[chainId],
      },
      {
        chainId:     chainId,
        feeDecimals: usdcDecimals,
        mintSymbol:  feeConfig.symbolOrMint,
        feeSymbol:   "USDC.s",
        transferFee: feeConfig.fee,
      },
    ),
    {
      variation: "Intent Transfer",
      paymasterDomain: SESSIONS_INTERNAL_PAYMASTER_DOMAIN,
    },
  );
}
