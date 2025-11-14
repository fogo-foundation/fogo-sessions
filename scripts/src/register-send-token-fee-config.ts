import { IntentTransferProgram } from "@fogo/sessions-idls";
import { PublicKey } from "@solana/web3.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { anchorOptions, createAnchorProvider } from "./anchor-options.js";
import BN from "bn.js";

export const main = async (argv: string[] = hideBin(process.argv)) => {
  const args = await yargs(argv)
    .command(
      "* <mint> <ata-creation-fee>",
      "Register the ATA creation fee for a given fee mint",
    )
    .options(anchorOptions)
    .positional("mint", {
      type: "string",
      description: "Mint address to set ntt manager for",
      demandOption: true,
      coerce: (mint: string) => new PublicKey(mint),
    })
    .positional("ata-creation-fee", {
      type: "number",
      description: "ATA creation fee for the mint",
      demandOption: true,
      coerce: (ataCreationFee: number) => new BN(ataCreationFee),
    })
    .parse();

  await new IntentTransferProgram(createAnchorProvider(args)).methods
    .registerFeeConfig({ataCreationFee: args.ataCreationFee, bridgingOutFee: new BN(0)})
    .accounts({ mint: args.mint, upgradeAuthority: {signer: undefined} })
    .rpc();
};
