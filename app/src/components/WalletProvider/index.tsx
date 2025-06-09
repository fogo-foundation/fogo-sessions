"use client";

import {
  ConnectionProvider,
  WalletProvider as WalletProviderImpl,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  BraveWalletAdapter,
  BackpackWalletAdapter,
  CoinbaseWalletAdapter,
  PhantomWalletAdapter,
  GlowWalletAdapter,
  LedgerWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import { type ReactNode, useMemo } from "react";

type Props = {
  children?: ReactNode | ReactNode[] | undefined;
  endpoint: string;
};

export const WalletProvider = ({ endpoint, children }: Props) => {
  const wallets = useMemo(
    () => [
      new BraveWalletAdapter(),
      new BackpackWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new PhantomWalletAdapter(),
      new GlowWalletAdapter(),
      new LedgerWalletAdapter(),
      new SolflareWalletAdapter(),
      new TorusWalletAdapter(),
    ],
    [],
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProviderImpl wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProviderImpl>
    </ConnectionProvider>
  );
};
