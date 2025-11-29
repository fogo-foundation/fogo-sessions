import type { Address } from "@solana/kit";
import { address } from "@solana/kit";
import type { DeriveType } from "@xlabs-xyz/binary-layout";
import { stringConversion } from "@xlabs-xyz/binary-layout";
import type { SvmClient } from "@xlabs-xyz/svm";
import {
  svmAddressItem,
  vecBytesItem,
  findPda,
  getDeserializedAccount
} from "@xlabs-xyz/svm";

//see https://github.com/metaplex-foundation/mpl-token-metadata/blob/9b514cdecb4d85da1c3046d2d7239d19e384a706/programs/token-metadata/program/src/lib.rs#L25
export const mplTokenMetadataProgramId = address("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s");

//see https://github.com/metaplex-foundation/mpl-token-metadata/blob/9b514cdecb4d85da1c3046d2d7239d19e384a706/clients/js/src/generated/types/key.ts#L16
const metadataV1Key = 4;
const mplKeyItem = (key: number) =>
  ({ binary: "uint", size: 1, custom: key, omit: true } as const);

//see https://github.com/metaplex-foundation/mpl-token-metadata/blob/9b514cdecb4d85da1c3046d2d7239d19e384a706/clients/js/src/generated/accounts/metadata.ts#L106-L111
export const mplMetadataTruncatedLayout = [
  { name: "key",             ...mplKeyItem(metadataV1Key)      },
  { name: "updateAuthority", ...svmAddressItem                 },
  { name: "mint",            ...svmAddressItem                 },
  { name: "name",            ...vecBytesItem(stringConversion) },
  { name: "symbol",          ...vecBytesItem(stringConversion) },
  { name: "uri",             ...vecBytesItem(stringConversion) },
  { name: "remainder",       binary: "bytes"                   },
] as const;
export type MplMetadataTruncated = DeriveType<typeof mplMetadataTruncatedLayout>;

export const mplMetadataPda = (mint: Address) =>
  findPda("metadata", mplTokenMetadataProgramId, mint, mplTokenMetadataProgramId);

export const getMplMetadataTruncated = (
  client: SvmClient,
  addr: Readonly<{ mint: Address } | { metadata: Address }>
) =>
  getDeserializedAccount(
    client,
    "mint" in addr ? mplMetadataPda(addr.mint) : addr.metadata,
    mplMetadataTruncatedLayout
  );

