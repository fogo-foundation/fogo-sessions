import { execFile } from "node:child_process";
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
import { normalizeVersionedTransactionBase64 } from "../../../lib/transactions";

const execFileAsync = promisify(execFile);

const Base64TransactionSchema = z.string().transform((val, ctx) => {
  const normalized = normalizeVersionedTransactionBase64(val);
  if (normalized) {
    return normalized;
  }
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    message: "Invalid base64 transaction",
  });
  return z.NEVER;
});

const RequestBodySchema = z.object({
  domain: z.string().min(1),
  transaction: Base64TransactionSchema,
  variation: VariationSchema,
});

export async function POST(req: NextRequest) {
  const parsed = RequestBodySchema.safeParse(await req.json());

  if (!parsed.success) {
    return NextResponse.json(
      { message: parsed.error.message, success: false },
      { status: 400 },
    );
  }

  const { transaction, domain, variation } = parsed.data;

  const tempPath = join(tmpdir(), `config-${Date.now()}.toml`);
  await writeFile(tempPath, generateConfigToml(domain, variation));

  try {
    // TODO: need to figure out how to fix the sponsor issue, handling both registered and unregistered domains
    // If domain is registered, we should just disregard the sponsor input arg.
    const parsedTransaction = VersionedTransaction.deserialize(
      new Uint8Array(Buffer.from(transaction, "base64")),
    );

    const feePayerKey = parsedTransaction.message.staticAccountKeys[0];
    if (!feePayerKey) {
      return NextResponse.json(
        { message: "Transaction has no fee payer", success: false },
        { status: 400 },
      );
    }
    const feePayer = feePayerKey.toBase58();

    const validatorPath = join(process.cwd(), "bin", "paymaster-tx-validator");
    const { stdout } = await execFileAsync(validatorPath, [
      "validate",
      "--config",
      tempPath,
      "--transaction",
      transaction,
      "--domain",
      domain,
      "--variation",
      variation.name,
      "--sponsor",
      feePayer,
    ]);

    // TODO: clean up the paymaster tx validator tool to have more standard success/error return format
    const success = stdout.includes("✅ Matches");
    const message = stdout;

    if (success) {
      return NextResponse.json({ message, success: true });
    } else {
      return NextResponse.json({ message, success: false });
    }
  } catch (error) {
    return NextResponse.json(
      {
        message: `Error validating transaction: ${(error as Error).message}`,
        success: false,
      },
      { status: 500 },
    );
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
      name: variation.name,
      version: "v0",
      whitelisted_programs: variation.transaction_variation,
    };
  } else if (variation.version === "v1") {
    return {
      instructions: variation.transaction_variation.map((ix) => ({
        accounts: ix.accounts,
        data: ix.data,
        program: ix.program,
        required: ix.required,
        requires_wrapped_native_tokens:
          ix.requires_wrapped_native_tokens ?? false,
      })),
      max_gas_spend: variation.max_gas_spend,
      name: variation.name,
      version: "v1",
    };
  }
  throw new Error("Unknown variation version");
}
