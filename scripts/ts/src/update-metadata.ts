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
import { fromWeb3JsKeypair } from "@metaplex-foundation/umi-web3js-adapters";
import { PublicKey } from "@solana/web3.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { anchorOptions, createAnchorProvider } from "./anchor-options.js";

export const main = async (argv: string[] = hideBin(process.argv)) => {
  const args = await yargs(argv)
    .command(
      "* <mint>",
      "Update the Metaplex metadata for the provided mint address",
    )
    .options({
      ...anchorOptions,
      name: {
        type: "string",
        description: "Token name",
      },
      symbol: {
        type: "string",
        description: "Token symbol",
      },
      tokenUri: {
        type: "string",
        description: "Token metadata uri",
      },
    })
    .positional("mint", {
      type: "string",
      description: "Mint to set the metadata for",
      demandOption: true,
      coerce: (mint: string) => new PublicKey(mint),
    })
    .parse();

  const provider = createAnchorProvider(args);

  const umi = createUmi(provider.connection.rpcEndpoint);
  if (provider.wallet.payer === undefined) {
    throw new Error("Wallet has no payer");
  }
  umi.use(keypairIdentity(fromWeb3JsKeypair(provider.wallet.payer), true));
  const mint = umiPublicKey(args.mint);
  const metadataPda = findMetadataPda(umi, { mint })[0];
  const metadata = await safeFetchMetadata(umi, metadataPda);

  if (metadata === null) {
    throw new Error(
      `No metadata account found for mint ${args.mint.toBase58()}.`,
    );
  }

  const { signature } = await updateV1(umi, {
    mint,
    metadata: metadataPda,
    authority: umi.identity,
    data: {
      name: args.name ?? metadata.name,
      symbol: args.symbol ?? metadata.symbol,
      uri: args.tokenUri ?? metadata.uri,
      sellerFeeBasisPoints: 0,
      // eslint-disable-next-line unicorn/no-null
      creators: null,
    },
  }).sendAndConfirm(umi);

  const signatureString = base58.deserialize(signature)[0];
  // eslint-disable-next-line no-console
  console.log(`Transaction signature: ${signatureString}`);
};
