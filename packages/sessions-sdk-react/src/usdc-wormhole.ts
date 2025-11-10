import { PublicKey } from "@solana/web3.js";

export const FOGO_USDC = {
  chain: "Fogo" as const,
  mint: new PublicKey("ELNbJ1RtERV2fjtuZjbTscDekWhVzkQ1LjmiPsxp5uND"),
  manager: new PublicKey("NTtktYPsu3a9fvQeuJW6Ea11kinvGc7ricT1iikaTue"),
  transceiver: new PublicKey("GJVgi8cwwUuyjjzM19xnT3KNYoX4pXvpp8UAS3ikgZLB"),
};

export const SOLANA_USDC = {
  chain: "Solana" as const,
  mint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
  manager: new PublicKey("NTtktYPsu3a9fvQeuJW6Ea11kinvGc7ricT1iikaTue"),
  transceiver: new PublicKey("BLu7SyjSHWZVsiSSWhx3f3sL11rBpuzRYM1HyobVZR4v"),
};

export const USDC_DECIMALS = 6;
