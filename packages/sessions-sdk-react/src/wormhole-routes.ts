import { Network } from "@fogo/sessions-sdk";
import { PublicKey } from "@solana/web3.js";

export const USDC = {
  decimals: 6,
  chains: {
    [Network.Mainnet]: {
      fogo: {
        chain: "Fogo" as const,
        mint: new PublicKey("UsdcSt7U9H5bVy4WaWgeqoowe8RgXpLShCmxUFgZssx"),
        manager: new PublicKey("NTtUtKGWF1ZaPNp5WkzRAPyrCNJ5X2VmqYisEJ1K5QZ"),
        transceiver: new PublicKey(
          "8N219XZ9n3ogcNawmSYrJstyAGeBSyq5AEFGAixpciXX",
        ),
      },
      solana: {
        chain: "Solana" as const,
        mint: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
        manager: new PublicKey("NTtUtKGWF1ZaPNp5WkzRAPyrCNJ5X2VmqYisEJ1K5QZ"),
        transceiver: new PublicKey(
          "4R4ZesEgyBYLzm58QL2iKKfdDTMhhqTZD9aV51GNrCKy",
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
