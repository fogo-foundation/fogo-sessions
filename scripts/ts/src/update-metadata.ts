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
        description: "Token name to update to, omit to leave as-is",
        type: "string",
      },
      symbol: {
        description: "Token symbol to update to, omit to leave as-is",
        type: "string",
      },
      tokenUri: {
        description: "Token metadata uri to update to, omit to leave as-is",
        type: "string",
      },
    })
    .positional("mint", {
      coerce: (mint: string) => new PublicKey(mint),
      demandOption: true,
      description: "Mint to set the metadata for",
      type: "string",
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
        authority: umi.identity,
        // eslint-disable-next-line unicorn/no-null
        creators: null,
        mint,
        name: args.name,
        sellerFeeBasisPoints: percentAmount(0),
        symbol: args.symbol,
        tokenStandard: TokenStandard.Fungible,
        uri: args.tokenUri ?? "",
      }).sendAndConfirm(umi),
    );
  } else {
    printSignature(
      await updateV1(umi, {
        authority: umi.identity,
        data: {
          // eslint-disable-next-line unicorn/no-null
          creators: null,
          name: args.name ?? metadata.name,
          sellerFeeBasisPoints: 0,
          symbol: args.symbol ?? metadata.symbol,
          uri: args.tokenUri ?? metadata.uri,
        },
        metadata: metadataPda,
        mint,
      }).sendAndConfirm(umi),
    );
  }
};

const printSignature = ({ signature }: { signature: TransactionSignature }) => {
  // biome-ignore lint/suspicious/noConsole: the point of this function is to log
  console.log(`Transaction signature: ${base58.deserialize(signature)[0]}`);
};
