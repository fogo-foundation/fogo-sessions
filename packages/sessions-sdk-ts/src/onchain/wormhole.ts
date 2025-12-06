
import type { Address } from "@solana/kit";
import { address } from "@solana/kit";
import type { DeriveType } from "@xlabs-xyz/binary-layout";
import { serialize, boolItem } from "@xlabs-xyz/binary-layout";
import type { RoUint8Array } from "@xlabs-xyz/const-utils";
import { findAta } from "@xlabs-xyz/svm";
import { keccak256 } from "@xlabs-xyz/utils";

import { pdaOfProgram } from "./common.js";
import type { ChainId } from "./constants.js";

export const solanaChainId = 1;

const chainIdToCoreBridge = {
  "fogo-mainnet": address("worm2mrQkG1B1KTz37erMfWN8anHkSK24nzca7UD8BB"),
  "fogo-testnet": address("BhnQyKoQQgpuRTRo6D8Emz93PvXCYfVgHhnrR4T3qhw4"),
} as const satisfies Record<ChainId, Address>;

export const executorProgramId        = address("execXUrAsMnqMmTHj5m7N1YQgsDz3cwGLYCYyuDRciV");
export const nttWithExecutorProgramId = address("nex1gkSWtRBheEJuQZMqHhbMG5A45qPU76KqnCZNVHR");

//all values are serialized in big endian in seeds
const wormholeChainIdItem = { binary: "uint", size: 2 } as const;
type WormholeChainId = number;
const amountItem = { binary: "uint", size: 8 } as const;

//wormhole chain ids are always serialized in big endian in seeds
const wormholeChainIdToSeed = (chain: WormholeChainId) =>
  serialize(wormholeChainIdItem, chain);

//reference: https://github.com/wormhole-foundation/wormhole-sdk-ts/blob/8dff2e4e1abe77b1a4ee671d435a52d634baa223/core/definitions/src/protocols/executor//signedQuote.ts#L44
const signedQuoteSize = 165;
export const signedQuoteItem = { binary: "bytes", size: signedQuoteSize } as const;

const universalAddressItem = { binary: "bytes", size: 32 } as const;

const sessionAuthoritySeedsToHashLayout = [
  { name: "amount",           ...amountItem           },
  { name: "recipientChain",   ...wormholeChainIdItem  },
  { name: "recipientAddress", ...universalAddressItem },
  { name: "shouldQueue",      ...boolItem()           },
] as const;
type SessionAuthoritySeed = DeriveType<typeof sessionAuthoritySeedsToHashLayout>;

//reference: https://github.com/wormhole-foundation/native-token-transfers/blob/f8ce9a8ac97810bfee60b93bf50e3b3cbfd02515/solana/ts/lib/ntt.ts#L85-L127
export const nttAddresses = (nttManagerProgramId: Address) => {
  const pda = pdaOfProgram(nttManagerProgramId);
  const tokenAuthorityPda = pda("token_authority");
  return {
    tokenAuthorityPda,
    configAccount:            pda("config"),
    outboxRateLimitPda:       pda("outbox_rate_limit"),
    pendingTokenAuthorityPda: pda("pending_token_authority"),
    lutPda:                   pda("lut"),
    lutAuthorityPda:          pda("lut_authority"),

    custodyAta: (mint: Address) =>
      findAta({ mint, owner: tokenAuthorityPda }),

    inboxRateLimitPda: (chain: WormholeChainId) =>
      pda("inbox_rate_limit", wormholeChainIdToSeed(chain)),

    inboxItemPda: (messageDigest: RoUint8Array) =>
      pda("inbox_item", messageDigest),

    peerPda: (chain: WormholeChainId) =>
      pda("peer", wormholeChainIdToSeed(chain)),

    registeredTransceiverPda: (transceiver: Address) =>
      pda("registered_transceiver", transceiver),

    sessionAuthorityPda: (sender: Address, seedsToHash: SessionAuthoritySeed) =>
      pda(
        "session_authority",
        sender,
        keccak256(serialize(sessionAuthoritySeedsToHashLayout, seedsToHash))
      ),
  } as const;
}

//reference: https://github.com/wormhole-foundation/native-token-transfers/blob/f8ce9a8ac97810bfee60b93bf50e3b3cbfd02515/solana/ts/lib/ntt.ts#L150-L168
export const transceiverAddresses = (nttManagerProgramId: Address) => {
  const pda = pdaOfProgram(nttManagerProgramId);
  const emitterPda = pda("emitter");
  return {
    emitterPda,

    outboxItemSignerPda: pda("outbox_item_signer"),

    transceiverPeerPda: (chain: WormholeChainId) =>
      pda("transceiver_peer", wormholeChainIdToSeed(chain)),

    transceiverMessagePda: (chain: WormholeChainId, id: RoUint8Array) =>
      pda("transceiver_message", wormholeChainIdToSeed(chain), id),

    unverifiedMessagePda: (payer: Address, seed: bigint) =>
      pda("vaa_body", payer, serialize(amountItem, seed)),

    wormholeMessagePda: (outboxItem: Address) =>
      pda("message", outboxItem),
  } as const;
}

//reference: https://github.com/wormhole-foundation/wormhole-sdk-ts/tree/main/platforms/solana/protocols/core/src/utils/accounts
export const coreBridgeAddresses = (chainId: ChainId) => {
  const coreBridgeProgramId = chainIdToCoreBridge[chainId];
  const pda = pdaOfProgram(coreBridgeProgramId);
  return {
    coreBridgeProgramId,

    bridgePda:       pda("Bridge"),
    feeCollectorPda: pda("fee_collector"),

    sequencePda: (emitterPda: Address) =>
      pda("Sequence", emitterPda),
  } as const;
}
