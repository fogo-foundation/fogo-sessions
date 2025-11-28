import { DomainRegistryIdl, DomainRegistryProgram } from "@fogo/sessions-idls";
import { sha256 } from "@noble/hashes/sha2";
import { PublicKey } from "@solana/web3.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { anchorOptions, createAnchorProvider } from "./anchor-options.js";

type AnchorArgs = Parameters<typeof createAnchorProvider>[0];

export const getDomainRecordAddress = (domain: string) => {
  const hash = sha256(domain);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("domain-record"), hash],
    new PublicKey(DomainRegistryIdl.address),
  )[0];
};

export const main = async (argv: string[] = hideBin(process.argv)) =>
  yargs(argv).options(anchorOptions)
    .command(
      ["add <domain> <program-id>", "* <domain> <program-id>"],
      "Add the given program ID to the whitelist of programs for the given domain",
      (y) =>
        y
          .positional("domain", {
            type: "string",
            description: "Domain to update",
            demandOption: true,
          })
          .positional("program-id", {
            type: "string",
            description: "Program ID to add to the domain",
            demandOption: true,
          }),
      (args) => handleAdd(args),
    )
    .command(
      "list <domain>",
      "List the program IDs whitelisted for the given domain",
      (y) =>
        y.positional("domain", {
          type: "string",
          description: "Domain to get whitelisted programs for",
          demandOption: true,
        }),
      (args) => handleList(args),
    )
    .command(
      "remove <domain> <program-id>",
      "Remove the given program ID from the whitelist of programs for the given domain",
      (y) =>
        y
          .positional("domain", {
            type: "string",
            description: "Domain to update",
            demandOption: true,
          })
          .positional("program-id", {
            type: "string",
            description: "Program ID to remove from the domain",
            demandOption: true,
          }),
      (args) => handleRemove(args),
    )
    .demandCommand(1, "Please specify a command")
    .strict()
    .parse();

    const handleAdd = async (args: {
      domain: string;
      "program-id": string;
    } & AnchorArgs) => {
      const program = new DomainRegistryProgram(createAnchorProvider(args));
    
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
    
    const handleList = async (args: { domain: string } & AnchorArgs) => {
      const domainRecord = await getDomainRecordAddress(args.domain);
      const provider = createAnchorProvider(args);
      const domainRecordData = (await provider.connection.getAccountInfo(domainRecord))?.data;
    
      if (domainRecordData) {
        const programs = [];
        for (let i = 0; i < domainRecordData.length; i += 64) {
          programs.push(new PublicKey(domainRecordData.subarray(i, i + 32)));
        }
        console.log(`Programs in domain record for "${args.domain}":`);
        for (const program of programs) {
          console.log(`- ${program.toBase58()}`);
        }
    
      }
      else {
        console.log(`No domain record found for domain "${args.domain}"`);
      }
    };
    
    const handleRemove = async (args: {
      domain: string;
      "program-id": string;
    } & AnchorArgs) => {
      const program = new DomainRegistryProgram(createAnchorProvider(args));
    
      await program.methods
        .removeProgram(args.domain)
        .accounts({
          programId: new PublicKey(args["program-id"]),
          domainRecord: getDomainRecordAddress(args.domain),
        })
        .rpc();
    };