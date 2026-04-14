import { Network } from "@fogo/sessions-sdk";
import { PublicKey } from "@solana/web3.js";

export const USDC = {
  chains: {
    [Network.Mainnet]: {
      fogo: {
        chain: "Fogo" as const,
        manager: new PublicKey("nttu74CdAmsErx5daJVCQNoDZujswFrskMzonoZSdGk"),
        mint: new PublicKey("uSd2czE61Evaf76RNbq4KPpXnkiL3irdzgLFUMe3NoG"),
        transceiver: new PublicKey(
          "9ioH2HQmVsnbmA8Ej5o1LCAHPRisS8of4whyjCNHJXiw",
        ),
      },
      solana: {
        chain: "Solana" as const,
        manager: new PublicKey("nttu74CdAmsErx5daJVCQNoDZujswFrskMzonoZSdGk"),
        mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
        transceiver: new PublicKey(
          "9ioH2HQmVsnbmA8Ej5o1LCAHPRisS8of4whyjCNHJXiw",
        ),
      },
    },
    [Network.Testnet]: {
      fogo: {
        chain: "Fogo" as const,
        manager: new PublicKey("NTtktYPsu3a9fvQeuJW6Ea11kinvGc7ricT1iikaTue"),
        mint: new PublicKey("ELNbJ1RtERV2fjtuZjbTscDekWhVzkQ1LjmiPsxp5uND"),
        transceiver: new PublicKey(
          "GJVgi8cwwUuyjjzM19xnT3KNYoX4pXvpp8UAS3ikgZLB",
        ),
      },
      solana: {
        chain: "Solana" as const,
        manager: new PublicKey("NTtktYPsu3a9fvQeuJW6Ea11kinvGc7ricT1iikaTue"),
        mint: new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"),
        transceiver: new PublicKey(
          "BLu7SyjSHWZVsiSSWhx3f3sL11rBpuzRYM1HyobVZR4v",
        ),
      },
    },
  },
  decimals: 6,
};
