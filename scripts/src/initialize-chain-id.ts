import { ChainIdProgram } from "@fogo/sessions-idls";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { anchorOptions, createAnchorProvider } from "./anchor-options.js";

export const main = async (argv: string[] = hideBin(process.argv)) => {
  const args = await yargs(argv)
    .command("* <chain-id>", "command")
    .options(anchorOptions)
    .positional("chain-id", {
      type: "string",
      description: "Chain ID to set as a string",
      demandOption: true,
    })
    .parse();

  await new ChainIdProgram(await createAnchorProvider(args)).methods
    .set(args["chain-id"])
    .rpc();
};
