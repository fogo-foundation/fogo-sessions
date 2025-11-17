import { Network as FogoNetwork } from "@fogo/sessions-sdk";
import type { ComponentProps } from "react";
import type { Link as UnstyledLink } from "react-aria-components";

import { Link } from "./link.js";

type Props = ComponentProps<typeof UnstyledLink> & {
  network: FogoNetwork | SolanaNetwork;
  txHash: string;
};

export const ExplorerLink = ({
  children,
  network,
  txHash,
  ...props
}: Props) => (
  <Link href={mkLink(network, txHash)} target="_blank" {...props}>
    {children ?? "Open Explorer"}
  </Link>
);

export enum SolanaNetwork {
  Mainnet,
  Devnet,
}

const mkLink = (network: FogoNetwork | SolanaNetwork, txHash: string) => {
  switch (network) {
    case FogoNetwork.Mainnet: {
      return `https://explorer.fogo.io/tx/${txHash}?cluster=mainnet-beta`;
    }

    case FogoNetwork.Testnet: {
      return `https://fogoscan.com/tx/${txHash}?cluster=testnet`;
    }

    case SolanaNetwork.Mainnet: {
      return `https://solscan.io/tx/${txHash}`;
    }
    case SolanaNetwork.Devnet: {
      return `https://solscan.io/tx/${txHash}?cluster=devnet`;
    }
  }
};
