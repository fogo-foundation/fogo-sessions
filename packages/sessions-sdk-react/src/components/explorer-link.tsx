import { Network } from "@fogo/sessions-sdk";
import type { ComponentProps } from "react";
import type { Link as UnstyledLink } from "react-aria-components";

import { Link } from "./link.js";

type Props = ComponentProps<typeof UnstyledLink> & {
  network: Network;
  chain?: Chain;
  txHash: string;
};

export const ExplorerLink = ({
  children,
  network,
  chain = Chain.Fogo,
  txHash,
  ...props
}: Props) => (
  <Link href={mkLink(network, chain, txHash)} target="_blank" {...props}>
    {children ?? "Open Explorer"}
  </Link>
);

export enum Chain {
  Solana,
  Fogo,
}

const mkLink = (network: Network, chain: Chain, txHash: string) => {
  switch (network) {
    case Network.Mainnet: {
      return chain === Chain.Solana
        ? `https://solscan.io/tx/${txHash}`
        : `https://fogoscan.com/tx/${txHash}?cluster=mainnet`;
    }
    case Network.Testnet: {
      return chain === Chain.Solana
        ? `https://solscan.io/tx/${txHash}?cluster=devnet`
        : `https://fogoscan.com/tx/${txHash}?cluster=testnet`;
    }
  }
};
