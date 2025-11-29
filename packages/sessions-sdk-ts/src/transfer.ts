import type { Wallet } from "@coral-xyz/anchor";
import { AnchorProvider } from "@coral-xyz/anchor";
import { IntentTransferProgram } from "@fogo/sessions-idls";
import { fromLegacyPublicKey } from "@solana/compat";
import { getAssociatedTokenAddressSync, getMint } from "@solana/spl-token";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

import { NonceType, amountToString, getNonce } from "./common.js";
import type { SessionContext } from "./context.js";
import { SESSIONS_INTERNAL_PAYMASTER_DOMAIN } from "./context.js";
import { chainIdToUsdcMint, usdcDecimals, usdcSymbol } from "./onchain/constants.js";
import { getMplMetadataTruncated, mplMetadataPda } from "./onchain/mpl-metadata.js";
import type { SigningFunc } from "./onchain/svm-intent.js";
import { composeEd25519IntentVerifyIx  } from "./onchain/svm-intent.js";

const CURRENT_INTENT_TRANSFER_MAJOR = "0";
const CURRENT_INTENT_TRANSFER_MINOR = "2";

const TRANSFER_MESSAGE_HEADER = `Fogo Transfer:
Signing this intent will transfer the tokens as described below.
`;

const getFee = async (context: SessionContext) => {
  const program = new IntentTransferProgram(
    new AnchorProvider(context.connection, {} as Wallet, {}),
  );
  const usdcMint = new PublicKey(chainIdToUsdcMint[context.chainId]);
  const [feeConfigPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("fee_config"), usdcMint.toBytes()],
    program.programId,
  );
  const feeConfig = await program.account.feeConfig.fetch(feeConfigPda);

  return {
    metadata: mplMetadataPda(fromLegacyPublicKey(usdcMint)),
    mint: usdcMint,
    symbolOrMint: usdcSymbol,
    decimals: usdcDecimals,
    fee: {
      intrachainTransfer: BigInt(feeConfig.intrachainTransferFee.toString()),
      bridgeTransfer: BigInt(feeConfig.bridgeTransferFee.toString()),
    },
  };
};

export const getTransferFee = async (context: SessionContext) => {
  const { fee, ...config } = await getFee(context);
  return {
    ...config,
    fee: fee.intrachainTransfer,
  };
};

export type SendTransferOptions = {
  context: SessionContext;
  walletPublicKey: PublicKey;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  mint: PublicKey;
  amount: bigint;
  recipient: PublicKey;
  feeConfig: Awaited<ReturnType<typeof getTransferFee>>;
};

const buildTransferIntentInstruction = async (
  program: IntentTransferProgram,
  options: SendTransferOptions,
  symbol: string | undefined,
  feeToken: string,
  feeAmount: string,
) => {
  const [nonce, { decimals }] = await Promise.all([
    getNonce(program, options.walletPublicKey, NonceType.Transfer),
    getMint(options.context.connection, options.mint),
  ]);

  const intent = {
    description: TRANSFER_MESSAGE_HEADER,
    parameters: {
      version: `${CURRENT_INTENT_TRANSFER_MAJOR}.${CURRENT_INTENT_TRANSFER_MINOR}`,
      chain_id: options.context.chainId,
      token: symbol ?? options.mint.toBase58(),
      amount: amountToString(options.amount, decimals),
      recipient: options.recipient.toBase58(),
      fee_token: feeToken,
      fee_amount: feeAmount,
      nonce: nonce === null ? "1" : nonce.nonce.add(new BN(1)).toString(),
    },
  };

  return composeEd25519IntentVerifyIx(
    fromLegacyPublicKey(options.walletPublicKey),
    options.signMessage as SigningFunc,
    intent,
  );
};

export const sendTransfer = async (options: SendTransferOptions) => {
  const sourceAta = getAssociatedTokenAddressSync(
    options.mint,
    options.walletPublicKey,
  );
  const program = new IntentTransferProgram(
    new AnchorProvider(options.context.connection, {} as Wallet, {}),
  );
  const mintAddress = fromLegacyPublicKey(options.mint);
  const metadata = await getMplMetadataTruncated(options.context.rpc, { mint: mintAddress });
  const symbol = metadata?.symbol ?? undefined;

  return options.context.sendTransaction(
    undefined,
    [
      await buildTransferIntentInstruction(
        program,
        options,
        symbol,
        options.feeConfig.symbolOrMint,
        amountToString(options.feeConfig.fee, options.feeConfig.decimals),
      ),
      await program.methods
        .sendTokens()
        .accounts({
          destinationOwner: options.recipient,
          feeMetadata: options.feeConfig.metadata,
          feeMint: options.feeConfig.mint,
          feeSource: getAssociatedTokenAddressSync(
            options.feeConfig.mint,
            options.walletPublicKey,
          ),
          mint: options.mint,
          source: sourceAta,
          sponsor: options.context.internalPayer,
          metadata:
            // eslint-disable-next-line unicorn/no-null
            symbol === undefined ? null : new PublicKey(mplMetadataPda(mintAddress)),
        })
        .instruction(),
    ],
    {
      variation: "Intent Transfer",
      paymasterDomain: SESSIONS_INTERNAL_PAYMASTER_DOMAIN,
    },
  );
};

