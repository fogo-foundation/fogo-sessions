"use client";

import {
  ConnectionProvider,
  WalletProvider as WalletProviderImpl,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import {
  CoinbaseWalletAdapter,
  LedgerWalletAdapter,
  TorusWalletAdapter,
} from "@solana/wallet-adapter-wallets";
import type { ReactNode } from "react";
import { useMemo } from "react";

type Props = {
  children?: ReactNode | ReactNode[] | undefined;
  endpoint: string;
};

export const WalletProvider = ({ endpoint, children }: Props) => {
  const wallets = useMemo(
    () => [
      new CoinbaseWalletAdapter(),
      new LedgerWalletAdapter(),
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
