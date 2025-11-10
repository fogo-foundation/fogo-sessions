import { AnchorProvider } from "@coral-xyz/anchor";
import { Connection } from "@solana/web3.js";
import type { Options } from "yargs";

import { parseSignerSource } from "./ledger.js";

export const anchorOptions = {
  url: {
    alias: "u",
    type: "string",
    description: "URL for Solana's JSON RPC or moniker",
    coerce: (url: string) => (url === "l" ? "http://localhost:8899" : url),
    demandOption: true,
  },
  keypair: {
    alias: "k",
    type: "string",
    description: "Filepath to a keypair",
    demandOption: true,
    coerce: (keypair: string) => parseSignerSource(keypair),
  },
} as const satisfies Record<string, Options>;

export const createAnchorProvider = async ({
  url,
  keypair,
}: {
  url: string;
  keypair: ReturnType<typeof parseSignerSource>;
}) => new AnchorProvider(new Connection(url), await keypair);
