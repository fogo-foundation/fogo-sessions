import { IntentTransferProgram } from "@fogo/sessions-idls";
import { PublicKey } from "@solana/web3.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { anchorOptions, createAnchorProvider } from "./anchor-options.js";

export const main = async (argv: string[] = hideBin(process.argv)) => {
  const args = await yargs(argv)
    .command(
      "* <mint> <ntt-manager>",
      "Register the ntt manager that the intent transfer will allow using when bridging out for a given mint",
    )
    .options(anchorOptions)
    .positional("mint", {
      coerce: (mint: string) => new PublicKey(mint),
      demandOption: true,
      description: "Mint address to set ntt manager for",
      type: "string",
    })
    .positional("ntt-manager", {
      coerce: (manager: string) => new PublicKey(manager),
      demandOption: true,
      description: "Address of NTT manager for the mint",
      type: "string",
    })
    .parse();

  await new IntentTransferProgram(createAnchorProvider(args)).methods
    .registerNttConfig()
    .accounts({
      mint: args.mint,
      nttManager: args.nttManager,
      upgradeAuthority: { signer: undefined },
    })
    .rpc();
};
