import { address } from "@solana/kit";
import { stringConversion } from "@xlabs-xyz/binary-layout";
import {
  type SvmClient,
  accountLayout,
  vecBytesItem,
  findPda,
  getDeserializedAccount,
} from "@xlabs-xyz/svm";
import { type ChainId, chainIds } from "./constants.js";

export const chainIdProgramId = address("Cha1RcWkdcF1dmGuTui53JmSnVCacCc2Kx2SY7zSFhaN");

export const chainIdLayout = accountLayout("ChainId", vecBytesItem(stringConversion));

export const chainIdPda = findPda("chain_id", chainIdProgramId);

export const getChainId = (client: SvmClient) =>
  getDeserializedAccount(client, chainIdPda, chainIdLayout)
    .then(chainId => {
      if (!(chainIds as readonly (string | undefined)[]).includes(chainId))
        throw new Error(`Invalid chain id: ${chainId}`);

      return chainId! as ChainId;
    });
