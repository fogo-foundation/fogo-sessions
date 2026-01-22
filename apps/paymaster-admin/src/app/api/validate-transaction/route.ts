import { exec } from "node:child_process";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { VersionedTransaction } from "@solana/web3.js";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import TOML from "smol-toml";
import { z } from "zod";
import type { Variation } from "../../../db-schema";
import { VariationSchema } from "../../../db-schema";

const execAsync = promisify(exec);

const Base64TransactionSchema = z.string().transform((val, ctx) => {
  try {
    const buffer = Buffer.from(val, "base64");
    const tx = VersionedTransaction.deserialize(new Uint8Array(buffer));
    return Buffer.from(tx.serialize()).toString("base64");
  } catch (e) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Invalid base64 transaction: ${(e as Error).message}`,
    });
  }
  return z.NEVER;
});

const RequestBodySchema = z.object({
  transaction: Base64TransactionSchema,
  domain: z.string().min(1),
  variation: VariationSchema,
});

export async function POST(req: NextRequest) {
  const parsed = RequestBodySchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, message: parsed.error.message },
      { status: 400 },
    );
  }

  const { transaction, domain, variation } = parsed.data;

  const tempPath = join(tmpdir(), `config-${Date.now()}.toml`);
  await writeFile(tempPath, generateConfigToml(domain, variation));

  try {
    // TODO: need to figure out how to fix the sponsor issue, handling both registered and unregistered domains
    const command = `paymaster-tx-validator validate --config ${tempPath} --transaction "${transaction}" --domain ${domain} --variation ${variation.name} --sponsor 11111111111111111111111111111111`;
    const { stdout } = await execAsync(command);

    // TODO: clean up the paymaster tx validator tool to have more standard success/error return format
    const success = stdout.includes("✅ Matches");
    const message = stdout;

    if (success) {
      return NextResponse.json({ success: true, message });
    } else {
      return NextResponse.json({ success: false, message });
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      message: `Error validating transaction: ${(error as Error).message}`,
    });
  } finally {
    await unlink(tempPath);
  }
}

function generateConfigToml(domain: string, variation: Variation): string {
  const config = {
    domains: [
      {
        domain,
        tx_variations: [convertToTomlFormat(variation)],
      },
    ],
  };
  return TOML.stringify(config);
}

function convertToTomlFormat(variation: Variation) {
  if (variation.version === "v0") {
    return {
      version: "v0",
      name: variation.name,
      whitelisted_programs: variation.transaction_variation,
    };
  } else if (variation.version === "v1") {
    return {
      version: "v1",
      name: variation.name,
      max_gas_spend: variation.max_gas_spend,
      instructions: variation.transaction_variation.map((ix) => ({
        program: ix.program,
        required: ix.required,
        accounts: ix.accounts,
        data: ix.data,
      })),
    };
  }
  throw new Error("Unknown variation version");
}
