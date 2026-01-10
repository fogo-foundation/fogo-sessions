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
    coerce: (keypair: string): Awaited<ReturnType<typeof parseSignerSource>> =>
      // @ts-expect-error yargs types are incorrect.  yargs will await the
      // coerce but the typescript types do not indicate so, so we explicitly
      // override yargs here to indicate that the return value is indeed
      // awaited.
      parseSignerSource(keypair),
  },
} as const satisfies Record<string, Options>;

export const createAnchorProvider = ({
  url,
  keypair,
}: {
  url: string;
  keypair: Awaited<ReturnType<typeof parseSignerSource>>;
}) => new AnchorProvider(new Connection(url), keypair);
