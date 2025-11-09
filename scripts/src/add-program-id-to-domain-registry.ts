import { DomainRegistryProgram } from "@fogo/sessions-idls";
import { getDomainRecordAddress } from "@fogo/sessions-sdk";
import { PublicKey } from "@solana/web3.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { anchorOptions, createAnchorProvider } from "./anchor-options.js";

export const main = async (argv: string[] = hideBin(process.argv)) => {
  const args = await yargs(argv)
    .command("* <domain> <program-id>", "command")
    .options(anchorOptions)
    .positional("domain", {
      type: "string",
      description: "Domain to update with the program id",
      demandOption: true,
    })
    .positional("program-id", {
      type: "string",
      description: "Program ID to add to the domain",
      demandOption: true,
    })
    .parse();

  const program = new DomainRegistryProgram(await createAnchorProvider(args));

  const { config: configPubkey } = await program.methods.initialize().pubkeys();

  const config = configPubkey
    ? await program.account.config.fetchNullable(configPubkey)
    : undefined;

  await program.methods
    .addProgram(args.domain)
    .accounts({
      programId: new PublicKey(args["program-id"]),
      domainRecord: getDomainRecordAddress(args.domain),
    })
    .preInstructions(
      config ? [] : [await program.methods.initialize().instruction()],
    )
    .rpc();
};
