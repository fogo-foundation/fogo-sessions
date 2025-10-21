import fs from "node:fs";

import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { DomainRegistryProgram } from "@fogo/sessions-idls";
import { getDomainRecordAddress } from "@fogo/sessions-sdk";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import yargs from "yargs";
import TransportNodeHid from "@ledgerhq/hw-transport-node-hid";
import { hideBin } from "yargs/helpers";
import { LedgerNodeWallet, parseDerivationPath } from "./ledger.js";

async function parseSignerSource(source: string) {
  if (source.startsWith("usb://ledger")) {
    return await LedgerNodeWallet.create(await parseDerivationPath(source));
  }
  else {
    const keypair = Keypair.fromSecretKey(
      Buffer.from(JSON.parse(fs.readFileSync(source, "utf8"))),
    );
    return new Wallet(keypair);
  }
}

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
    .positional("domain", {
      type: "string",
      description: "Domain to update with the program id",
    })
    .positional("program-id", {
      type: "string",
      description: "Program ID to add to the domain",
    })
    .parse();

  if (!args.url) {
    throw new Error("Missing required argument: url");
  }

  if (!args.keypair) {
    throw new Error("Missing required argument: keypair");
  }

  if (!args.domain) {
    throw new Error("Missing required argument: domain");
  }

  if (!args["program-id"]) {
    throw new Error("Missing required argument: program-id");
  }

  const url = args.url == "l" ? "http://localhost:8899" : args.url;

  const connection = new Connection(url);
  const provider = new AnchorProvider(connection, await parseSignerSource(args.keypair));
  const program = new DomainRegistryProgram(provider);

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
