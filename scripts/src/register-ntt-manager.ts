import { IntentTransferProgram } from "@fogo/sessions-idls";
import { PublicKey } from "@solana/web3.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { anchorOptions, createAnchorProvider } from "./anchor-options.js";

export const main = async (argv: string[] = hideBin(process.argv)) => {
  const args = await yargs(argv)
    .command("* <mint> <ntt-manager>", "command")
    .options(anchorOptions)
    .positional("mint", {
      type: "string",
      description: "Mint address to set ntt manager for",
      demandOption: true,
      coerce: (mint: string) => new PublicKey(mint),
    })
    .positional("ntt-manager", {
      type: "string",
      description: "Address of NTT manager for the mint",
      demandOption: true,
      coerce: (manager: string) => new PublicKey(manager),
    })
    .parse();

  const provider = await createAnchorProvider(args);
  const program = new IntentTransferProgram(provider);

  await program.methods
    .registerNttConfig()
    .accounts({
      mint: args.mint,
      nttManager: args.nttManager,
      updateAuthority: provider.wallet.publicKey,
    })
    .rpc();
};
