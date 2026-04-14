import { IntentTransferProgram } from "@fogo/sessions-idls";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { anchorOptions, createAnchorProvider } from "./anchor-options.js";

export const main = async (argv: string[] = hideBin(process.argv)) => {
  const args = await yargs(argv)
    .command(
      "* <mint> <intrachain-transfer-fee> <bridge-transfer-fee>",
      "Register the intent transfer fees for a given fee mint",
    )
    .options(anchorOptions)
    .positional("mint", {
      coerce: (mint: string) => new PublicKey(mint),
      demandOption: true,
      description: "Mint address to set ntt manager for",
      type: "string",
    })
    .positional("intrachain-transfer-fee", {
      coerce: (intrachainTransferFee: number) => new BN(intrachainTransferFee),
      demandOption: true,
      description: "Intrachain transfer fee for the mint",
      type: "number",
    })
    .positional("bridge-transfer-fee", {
      coerce: (bridgeTransferFee: number) => new BN(bridgeTransferFee),
      demandOption: true,
      description: "Bridge transfer fee for the mint",
      type: "number",
    })
    .parse();

  await new IntentTransferProgram(createAnchorProvider(args)).methods
    .registerFeeConfig({
      bridgeTransferFee: args.bridgeTransferFee,
      intrachainTransferFee: args.intrachainTransferFee,
    })
    .accounts({ mint: args.mint, upgradeAuthority: { signer: undefined } })
    .rpc();
};
