import {
  findMetadataPda,
  safeFetchMetadata,
  updateV1,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  keypairIdentity,
  publicKey as umiPublicKey,
} from "@metaplex-foundation/umi";
import { base58 } from "@metaplex-foundation/umi/serializers";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import {fromWeb3JsKeypair} from "@metaplex-foundation/umi-web3js-adapters";

import { anchorOptions, createAnchorProvider } from "./anchor-options.js";
import { PublicKey } from "@solana/web3.js";

export const main = async (argv: string[] = hideBin(process.argv)) => {
  const args = await yargs(argv)
    .command(
      "* <mint>",
      "Update the Metaplex metadata for the provided mint address",
    )
    .options(anchorOptions)
    .positional("mint", {
      type: "string",
      description: "Mint to set the metadata for",
      demandOption: true,
      coerce: (mint: string) => new PublicKey(mint),
    })
    .parse();

  const provider = createAnchorProvider(args)

  const umi  = createUmi(provider.connection.rpcEndpoint);
  umi.use(
    keypairIdentity(fromWeb3JsKeypair(provider.wallet.payer!),true)
  );
  const mint = umiPublicKey(args.mint);
  const metadataPda = findMetadataPda(umi, { mint })[0];
  const metadata = await safeFetchMetadata(umi, metadataPda);

  if (metadata === null) {
    throw new Error(`No metadata account found for mint ${args.mint}.`);
  }

  const data =
  { name: "USDC",
   symbol: "USDC.s",
   uri:"https://arweave.net/nE8Yxx_CJmiSZvYWv8qS-SGG2yw-UEIkDa1pGmVraks",
   sellerFeeBasisPoints: 0,
   creators: null,
 }

  const { signature } = await updateV1(umi, {
    mint,
    metadata: metadataPda,
    authority: umi.identity,
    data,
  }).sendAndConfirm(umi);

  const signatureString = base58.deserialize(signature)[0];
  console.log(`Transaction signature: ${signatureString}`);
};
