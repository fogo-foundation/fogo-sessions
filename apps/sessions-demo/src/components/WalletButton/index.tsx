"use client";

import dynamic from "next/dynamic";

export const WalletDisconnectButton = dynamic(
  async () => {
    const { WalletDisconnectButton } = await import(
      "@solana/wallet-adapter-react-ui"
    );
    return WalletDisconnectButton;
  },
  { ssr: false },
);

export const WalletMultiButton = dynamic(
  async () => {
    const { WalletMultiButton } = await import(
      "@solana/wallet-adapter-react-ui"
    );
    return WalletMultiButton;
  },
  { ssr: false },
);
