import { IntentTransferProgram } from "@fogo/sessions-idls";
import { fromLegacyPublicKey } from "@solana/compat";
import { getProgramDerivedAddress } from "@solana/kit";
import { PublicKey } from "@solana/web3.js";

export enum NonceType {
  Transfer,
  Bridge,
}

export const NONCE_TYPE_TO_SEED: Record<NonceType, string> = {
  [NonceType.Transfer]: "nonce",
  [NonceType.Bridge]: "bridge_ntt_nonce",
};

export const getNonce = async (
  program: IntentTransferProgram,
  walletPublicKey: PublicKey,
  nonceType: NonceType,
) => {
  const [noncePda] = await getProgramDerivedAddress({
    programAddress: fromLegacyPublicKey(program.programId),
    seeds: [
      Buffer.from(NONCE_TYPE_TO_SEED[nonceType]),
      walletPublicKey.toBuffer(),
    ],
  });
  return program.account.nonce.fetchNullable(noncePda);
};

