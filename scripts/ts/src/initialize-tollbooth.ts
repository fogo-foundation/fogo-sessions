import { DomainRegistryProgram, TollboothIdl } from "@fogo/sessions-idls";
import { sha256 } from "@noble/hashes/sha2";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  NATIVE_MINT,
} from "@solana/spl-token";
import { PublicKey, Transaction } from "@solana/web3.js";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import { anchorOptions, createAnchorProvider } from "./anchor-options.js";
import { getDomainRecordAddress } from "./domain-registry.js";

const USDC_MINT = {
  mainnet: "uSd2czE61Evaf76RNbq4KPpXnkiL3irdzgLFUMe3NoG",
  testnet: "ELNbJ1RtERV2fjtuZjbTscDekWhVzkQ1LjmiPsxp5uND",
} as const;

const getDomainTollRecipientAddress = (domain: string) => {
  const hash = sha256(domain);
  return PublicKey.findProgramAddressSync(
    [Buffer.from("toll_recipient"), Buffer.from([0]), hash],
    new PublicKey(TollboothIdl.address),
  )[0];
};

const resolveDefaultMints = (url: string) => {
  const normalizedUrl = url.toLowerCase();
  const usdcMint = normalizedUrl.includes("mainnet")
    ? USDC_MINT.mainnet
    : USDC_MINT.testnet;
  return [new PublicKey(usdcMint), NATIVE_MINT];
};

export const main = async (argv: string[] = hideBin(process.argv)) => {
  const args = await yargs(argv)
    .command(
      "* <domain> [mints..]",
      "Add the tollbooth program to a domain registry and initialize fee recipient token accounts",
    )
    .options(anchorOptions)
    .positional("domain", {
      type: "string",
      description: "Domain to configure",
      demandOption: true,
    })
    .positional("mints", {
      type: "string",
      array: true,
      description: "Mint addresses or symbols (USDC, WSOL)",
    })
    .parse();

  const provider = createAnchorProvider(args);
  const registryProgram = new DomainRegistryProgram(provider);

  const domainRecord = getDomainRecordAddress(args.domain);
  const programId = new PublicKey(TollboothIdl.address);
  const domainRecordInfo =
    await provider.connection.getAccountInfo(domainRecord);
  const programAlreadyAdded = domainRecordInfo?.data
    ? (() => {
        for (let i = 0; i < domainRecordInfo.data.length; i += 64) {
          const entry = domainRecordInfo.data.subarray(i, i + 32);
          if (entry.length === 32 && new PublicKey(entry).equals(programId)) {
            return true;
          }
        }
        return false;
      })()
    : false;

  if (!programAlreadyAdded) {
    const { config: configPubkey } = await registryProgram.methods
      .initialize()
      .pubkeys();
    const config = configPubkey
      ? await registryProgram.account.config.fetchNullable(configPubkey)
      : undefined;

    await registryProgram.methods
      .addProgram(args.domain)
      .accounts({
        programId,
        domainRecord,
      })
      .preInstructions(
        config
          ? []
          : [await registryProgram.methods.initialize().instruction()],
      )
      .rpc();
  }
  const mints = [
    ...new Set(args.mints?.map((mint) => new PublicKey(mint))),
    ...resolveDefaultMints(provider.connection.rpcEndpoint),
  ];

  const recipient = getDomainTollRecipientAddress(args.domain);
  const payer = provider.wallet.publicKey;
  const instructions = mints.map((mint) =>
    createAssociatedTokenAccountIdempotentInstruction(
      payer,
      getAssociatedTokenAddressSync(mint, recipient, true),
      recipient,
      mint,
    ),
  );

  if (instructions.length > 0) {
    const transaction = new Transaction().add(...instructions);
    await provider.sendAndConfirm(transaction);
  }
};
