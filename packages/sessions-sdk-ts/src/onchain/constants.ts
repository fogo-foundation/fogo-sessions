import type { Address } from "@solana/kit";
import { address } from "@solana/kit";

export const chainIds = ["fogo-mainnet", "fogo-testnet"] as const;
export type ChainId = typeof chainIds[number];

export const usdcDecimals = 6;
export const usdcSymbol = "USDC.s";

export const chainIdToUsdcMint = {
  "fogo-mainnet": address("uSd2czE61Evaf76RNbq4KPpXnkiL3irdzgLFUMe3NoG"),
  "fogo-testnet": address("ELNbJ1RtERV2fjtuZjbTscDekWhVzkQ1LjmiPsxp5uND"),
} as const satisfies Record<ChainId, Address>;

export const chainIdToSessionStartAlt = {
  "fogo-mainnet": undefined,
  "fogo-testnet": address("B8cUjJMqaWWTNNSTXBmeptjWswwCH1gTSCRYv4nu7kJW"),
} as const satisfies Record<ChainId, Address | undefined>;

