import { PublicKey } from "@solana/web3.js";

export const deserializePublicKeyList = (pubkeyList: (PublicKey | string)[]) =>
  pubkeyList.map((pubkey) => deserializePublicKey(pubkey));

export const deserializePublicKeyMap = <T>(
  pubkeyMap: Map<PublicKey, T> | Record<string, T>,
): Map<PublicKey, T> =>
  pubkeyMap instanceof Map
    ? pubkeyMap
    : new Map(
        Object.entries(pubkeyMap).map(([pubkey, value]) => [
          deserializePublicKey(pubkey),
          value,
        ]),
      );

export const deserializePublicKey = (pubkey: PublicKey | string) =>
  pubkey instanceof PublicKey ? pubkey : new PublicKey(pubkey);
