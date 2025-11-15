import { IntentTransferProgram } from "@fogo/sessions-idls";
import { PublicKey } from "@solana/web3.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { anchorOptions, createAnchorProvider } from "./anchor-options.js";
import BN from "bn.js";

export const main = async (argv: string[] = hideBin(process.argv)) => {
  const args = await yargs(argv)
    .command(
      "* <mint> <intrachain-transfer-fee> <bridge-transfer-fee>",
      "Register the intent transfer fees for a given fee mint",
    )
    .options(anchorOptions)
    .positional("mint", {
      type: "string",
      description: "Mint address to set ntt manager for",
      demandOption: true,
      coerce: (mint: string) => new PublicKey(mint),
    })
    .positional("intrachain-transfer-fee", {
      type: "number",
      description: "Intrachain transfer fee for the mint",
      demandOption: true,
      coerce: (intrachainTransferFee: number) => new BN(intrachainTransferFee),
    })
    .positional("bridge-transfer-fee", {
      type: "number",
      description: "Bridge transfer fee for the mint",
      demandOption: true,
      coerce: (bridgeTransferFee: number) => new BN(bridgeTransferFee),
    })
    .parse();

  await new IntentTransferProgram(createAnchorProvider(args)).methods
    .registerFeeConfig({intrachainTransferFee: args.intrachainTransferFee, bridgeTransferFee: args.bridgeTransferFee})
    .accounts({ mint: args.mint, upgradeAuthority: {signer: undefined} })
    .rpc();
};
