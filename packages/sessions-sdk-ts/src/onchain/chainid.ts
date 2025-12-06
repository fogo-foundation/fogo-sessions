import { address } from "@solana/kit";
import { stringConversion } from "@xlabs-xyz/binary-layout";
import type { RoArray } from "@xlabs-xyz/const-utils";
import type { SvmClient } from "@xlabs-xyz/svm";
import {
  accountLayout,
  vecBytesItem,
  findPda,
  getDeserializedAccount
} from "@xlabs-xyz/svm";

import type { ChainId } from "./constants.js";
import { chainIds } from "./constants.js";

export const chainIdProgramId = address("Cha1RcWkdcF1dmGuTui53JmSnVCacCc2Kx2SY7zSFhaN");

export const chainIdLayout = accountLayout("ChainId", vecBytesItem(stringConversion));

export const chainIdPda = findPda("chain_id", chainIdProgramId);

export const getChainId = (client: SvmClient) =>
  getDeserializedAccount(client, chainIdPda, chainIdLayout)
    .then(chainId => {
      if (chainId === undefined)
        throw new Error("Couldn't fetch chain id account");

      if (!(chainIds as RoArray<string>).includes(chainId))
        throw new Error(`Unexpected chain id: ${chainId}`);

      return chainId as ChainId;
    });

