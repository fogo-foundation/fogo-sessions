/**
 * @file Utility functions for deserializing PublicKey objects from strings.
 *
 * These functions handle conversion between string representations and PublicKey
 * objects, supporting both individual keys and collections.
 */

import { PublicKey } from '@solana/web3.js';

/**
 * Deserializes a list of public keys from mixed string/PublicKey array.
 *
 * @param pubkeyList - Array containing PublicKey objects and/or base58 strings
 * @returns Array of PublicKey objects
 *
 * @example
 * ```typescript
 * const mixed = [
 *   'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
 *   new PublicKey('11111111111111111111111111111112')
 * ];
 * const pubkeys = deserializePublicKeyList(mixed);
 * ```
 *
 * @category Utilities
 * @public
 */
export const deserializePublicKeyList = (pubkeyList: (PublicKey | string)[]) =>
  pubkeyList.map((pubkey) => deserializePublicKey(pubkey));

/**
 * Deserializes a map or record with public key keys.
 *
 * Converts a Record<string, T> to Map<PublicKey, T>, or passes through
 * an existing Map<PublicKey, T> unchanged.
 *
 * @param pubkeyMap - Map or record with public key strings/objects as keys
 * @returns Map with PublicKey objects as keys
 *
 * @example
 * ```typescript
 * const limits = {
 *   'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1000000n
 * };
 * const pubkeyLimits = deserializePublicKeyMap(limits);
 * ```
 *
 * @category Utilities
 * @public
 */
export const deserializePublicKeyMap = <T>(
  pubkeyMap: Map<PublicKey, T> | Record<string, T>
): Map<PublicKey, T> =>
  pubkeyMap instanceof Map
    ? pubkeyMap
    : new Map(
        Object.entries(pubkeyMap).map(([pubkey, value]) => [
          deserializePublicKey(pubkey),
          value,
        ])
      );

/**
 * Deserializes a single public key from string or PublicKey.
 *
 * @param pubkey - PublicKey object or base58 string representation
 * @returns PublicKey object
 *
 * @example
 * ```typescript
 * const pk1 = deserializePublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
 * const pk2 = deserializePublicKey(new PublicKey('11111111111111111111111111111112'));
 * ```
 *
 * @category Utilities
 * @public
 */
export const deserializePublicKey = (pubkey: PublicKey | string) =>
  pubkey instanceof PublicKey ? pubkey : new PublicKey(pubkey);
