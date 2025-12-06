import { address } from "@solana/kit";
import type { DeriveType } from "@xlabs-xyz/binary-layout";
import type { SvmClient } from "@xlabs-xyz/svm";
import {
  svmAddressItem,
  findPda,
  getDeserializedAccount
} from "@xlabs-xyz/svm";
import { sha256, bytes } from "@xlabs-xyz/utils";

export const domainRegistryProgramId = address("DomaLfEueNY6JrQSEFjuXeUDiohFmSrFeTNTPamS2yog");

export const domainRecordLayout =
  { binary: "array", layout: [
    { name: "programId", ...svmAddressItem },
    { name: "signerPda", ...svmAddressItem },
  ]} as const;
export type DomainRecord = DeriveType<typeof domainRecordLayout>;

export const domainRecordPda = (domain: string) =>
  findPda("domain-record", sha256(bytes.encode(domain)), domainRegistryProgramId);

export const getDomainRecord = (client: SvmClient, domain: string) =>
  getDeserializedAccount(client, domainRecordPda(domain), domainRecordLayout);

