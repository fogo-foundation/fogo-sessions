import { DomainRegistryIdl, DomainRegistryProgram } from "@fogo/sessions-idls";
import { PublicKey } from "@solana/web3.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import { anchorOptions, createAnchorProvider } from "./anchor-options.js";
import { sha256 } from "@noble/hashes/sha2";

type AnchorArgs = Parameters<typeof createAnchorProvider>[0];

export const getDomainRecordAddress = (domain: string) => {
  const hash = sha256(domain);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("domain-record"), hash],
    new PublicKey(DomainRegistryIdl.address),
  )[0];
};

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

const handleView = async (args: { domain: string } & AnchorArgs) => {
  const domainRecord = await getDomainRecordAddress(args.domain);
  const provider = createAnchorProvider(args);
  const domainRecordData = (await provider.connection.getAccountInfo(domainRecord))?.data;

  if (domainRecordData) {
    const programs = [];
    for (let i = 0; i < domainRecordData.length; i += 64) {
      programs.push(new PublicKey(domainRecordData.subarray(i, i + 32)));
    }
    console.log(`Programs in domain record for "${args.domain}":`);
    programs.forEach((program) => {
      console.log(`- ${program.toBase58()}`);
    });

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

export const main = async (argv: string[] = hideBin(process.argv)) =>
  yargs(argv).options(anchorOptions)    .options(anchorOptions)
    .command(
      ["add <domain> <program-id>", "* <domain> <program-id>"],
      "Add the given program ID to the whitelist of programs for the given domain",
      (y) =>
        y
          .positional("domain", {
            type: "string",
            description: "Domain to update with the program id",
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
      "view <domain>",
      "View the program IDs whitelisted for the given domain",
      (y) =>
        y.positional("domain", {
          type: "string",
          description: "Domain to view",
          demandOption: true,
        }),
      (args) => handleView(args),
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
    .parseAsync();
