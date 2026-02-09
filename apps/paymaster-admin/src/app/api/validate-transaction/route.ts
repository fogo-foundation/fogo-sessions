import { execFile } from "node:child_process";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
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
      "11111111111111111111111111111111",
    ]);

    // TODO: clean up the paymaster tx validator tool to have more standard success/error return format
    const success = stdout.includes("✅ Matches");
    const message = stdout;

    if (success) {
      return NextResponse.json({ success: true, message });
    } else {
      return NextResponse.json({ success: false, message });
    }
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: `Error validating transaction: ${(error as Error).message}`,
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
        tx_variations: [variation],
      },
    ],
  };
  return TOML.stringify(config);
}
