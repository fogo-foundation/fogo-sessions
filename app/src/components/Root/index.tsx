import type { ReactNode } from "react";
import { WalletProvider } from "../WalletProvider";
import { SOLANA_RPC } from "@/config/server";

type Props = {
  children: ReactNode;
};

export const Root = ({ children }: Props) => {
  return (
    <WalletProvider endpoint={SOLANA_RPC}>
        <html>
          <body>{children}</body>
        </html>
    </WalletProvider>
  );
};
