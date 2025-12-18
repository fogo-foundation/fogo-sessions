import {
  createV1,
  findMetadataPda,
  safeFetchMetadata,
  TokenStandard,
  updateV1,
} from "@metaplex-foundation/mpl-token-metadata";
import type { TransactionSignature } from "@metaplex-foundation/umi";
import {
  keypairIdentity,
  percentAmount,
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
        description: "Token name to update to, omit to leave as-is",
      },
      symbol: {
        type: "string",
        description: "Token symbol to update to, omit to leave as-is",
      },
      tokenUri: {
        type: "string",
        description: "Token metadata uri to update to, omit to leave as-is",
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
    throw new Error(
      "Wallet has no payer.  Note this script does not currently work with ledgers.",
    );
  }
  umi.use(keypairIdentity(fromWeb3JsKeypair(provider.wallet.payer), true));
  const mint = umiPublicKey(args.mint);
  const metadataPda = findMetadataPda(umi, { mint })[0];
  const metadata = await safeFetchMetadata(umi, metadataPda);

  if (metadata === null) {
    if (args.name === undefined) {
      throw new Error(
        "Name is required when setting metadata for the first time",
      );
    }
    if (args.symbol === undefined) {
      throw new Error(
        "Symbol is required when setting metadata for the first time",
      );
    }
    printSignature(
      await createV1(umi, {
        mint,
        authority: umi.identity,
        name: args.name,
        symbol: args.symbol,
        uri: args.tokenUri ?? "",
        sellerFeeBasisPoints: percentAmount(0),
        tokenStandard: TokenStandard.Fungible,
        creators: null,
      }).sendAndConfirm(umi),
    );
  } else {
    printSignature(
      await updateV1(umi, {
        mint,
        metadata: metadataPda,
        authority: umi.identity,
        data: {
          name: args.name ?? metadata.name,
          symbol: args.symbol ?? metadata.symbol,
          uri: args.tokenUri ?? metadata.uri,
          sellerFeeBasisPoints: 0,
          creators: null,
        },
      }).sendAndConfirm(umi),
    );
  }
};

const printSignature = ({ signature }: { signature: TransactionSignature }) => {
  console.log(`Transaction signature: ${base58.deserialize(signature)[0]}`);
};
