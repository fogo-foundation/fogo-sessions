import { Network } from "@fogo/sessions-sdk";
import { PublicKey } from "@solana/web3.js";

export const USDC = {
  decimals: 6,
  chains: {
    [Network.Mainnet]: {
      fogo: {
        chain: "Fogo" as const,
        mint: new PublicKey("uSd2czE61Evaf76RNbq4KPpXnkiL3irdzgLFUMe3NoG"),
        manager: new PublicKey("nttu74CdAmsErx5daJVCQNoDZujswFrskMzonoZSdGk"),
        transceiver: new PublicKey(
          "9ioH2HQmVsnbmA8Ej5o1LCAHPRisS8of4whyjCNHJXiw",
        ),
      },
      solana: {
        chain: "Solana" as const,
        mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
        manager: new PublicKey("nttu74CdAmsErx5daJVCQNoDZujswFrskMzonoZSdGk"),
        transceiver: new PublicKey(
          "9ioH2HQmVsnbmA8Ej5o1LCAHPRisS8of4whyjCNHJXiw",
        ),
      },
    },
    [Network.Testnet]: {
      fogo: {
        chain: "Fogo" as const,
        mint: new PublicKey("ELNbJ1RtERV2fjtuZjbTscDekWhVzkQ1LjmiPsxp5uND"),
        manager: new PublicKey("NTtktYPsu3a9fvQeuJW6Ea11kinvGc7ricT1iikaTue"),
        transceiver: new PublicKey(
          "GJVgi8cwwUuyjjzM19xnT3KNYoX4pXvpp8UAS3ikgZLB",
        ),
      },
      solana: {
        chain: "Solana" as const,
        mint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
        manager: new PublicKey("NTtktYPsu3a9fvQeuJW6Ea11kinvGc7ricT1iikaTue"),
        transceiver: new PublicKey(
          "BLu7SyjSHWZVsiSSWhx3f3sL11rBpuzRYM1HyobVZR4v",
        ),
      },
    },
  },
};
