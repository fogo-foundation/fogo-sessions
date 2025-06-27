import fs from "node:fs";

import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import type { ChainId } from "@fogo/sessions-idls";
import { ChainIdIdl } from "@fogo/sessions-idls";
import { Connection, Keypair } from "@solana/web3.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

export const main = async (argv: string[] = hideBin(process.argv)) => {
  const args = await yargs(argv)
    .option("url", {
      alias: "u",
      type: "string",
      description: "URL for Solana's JSON RPC or moniker",
    })
    .option("keypair", {
      alias: "k",
      type: "string",
      description: "Filepath to a keypair",
    })
    .positional("chain-id", {
      type: "string",
      description: "Chain ID to set as a string",
    })
    .parse();

  if (!args.url) {
    throw new Error("Missing required argument: url");
  }

  if (!args.keypair) {
    throw new Error("Missing required argument: keypair");
  }

  if (!args["chain-id"]) {
    throw new Error("Missing required argument: chain-id");
  }

  const url = args.url == "l" ? "http://localhost:8899" : args.url;

  const connection = new Connection(url);
  const keypair = Keypair.fromSecretKey(
    Buffer.from(JSON.parse(fs.readFileSync(args.keypair, "utf8"))),
  );
  const provider = new AnchorProvider(connection, new Wallet(keypair));
  const program = new Program<ChainId>(ChainIdIdl as ChainId, provider);
  await program.methods.set(args["chain-id"]).rpc();
};
