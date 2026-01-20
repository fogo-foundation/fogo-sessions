import { exec } from "node:child_process";
import { unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import type {
  AccountConstraint,
  ContextualPubkey,
  DataConstraint,
  DataConstraintSpecification,
  InstructionConstraint,
  PrimitiveDataType,
  PrimitiveDataValue,
  Variation,
} from "../../../db-schema";

const execAsync = promisify(exec);

export async function POST(req: NextRequest) {
  const { transaction, domain, variation } = await req.json();

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

function generateConfigToml(domain: string, variation: Variation) {
  const domainPrefix = `
    [[domains]]
    domain = "${domain}"
  `;

  return domainPrefix + convertVariationToToml(variation);
}

function convertVariationToToml(variation: Variation) {
  if (variation.version === "v0") {
    return `
      [[domains.tx_variations]]
      version = "v0"
      name = "${variation.name}"
      whitelisted_programs = [
        ${variation.transaction_variation.map((program) => `        "${program}"`).join(",\n")}
      ]
      `;
  } else if (variation.version === "v1") {
    return (
      `
      [[domains.tx_variations]]
      version = "v1"
      name = "${variation.name}"
      max_gas_spend = ${variation.max_gas_spend}
    ` +
      [
        variation.transaction_variation
          .map((ix) => convertInstructionConstraintToToml(ix))
          .join("\n"),
      ]
    );
  } else {
    throw new Error(`Unknown variation version`);
  }
}

function convertInstructionConstraintToToml(
  instruction: InstructionConstraint,
) {
  return (
    `
      [[domains.tx_variations.instructions]]
      program = "${instruction.program}"
      required = ${instruction.required}
    ` +
    [
      instruction.accounts
        .map((acc) => convertAccountConstraintToToml(acc))
        .join("\n"),
    ] +
    [
      instruction.data
        .map((data) => convertDataConstraintToToml(data))
        .join("\n"),
    ]
  );
}

function convertAccountConstraintToToml(account: AccountConstraint) {
  return `
      [[domains.tx_variations.instructions.accounts]]
      index = ${account.index}
      include = [
        ${account.include.map((pubkey) => convertContextualPubkeyToToml(pubkey)).join(",\n        ")}
      ]
      exclude = [
        ${account.exclude.map((pubkey) => convertContextualPubkeyToToml(pubkey)).join(",\n        ")}
      ]
    `;
}

function convertContextualPubkeyToToml(value: ContextualPubkey): string {
  if (typeof value === "string") {
    return `"${value}"`;
  } else if (typeof value === "object" && "Explicit" in value) {
    return `{ Explicit = { pubkey = "${value.Explicit.pubkey}" } }`;
  }
  throw new Error(`Unknown ContextualPubkey variant: ${JSON.stringify(value)}`);
}

function convertDataConstraintToToml(data: DataConstraint) {
  return `
      [[domains.tx_variations.instructions.data]]
      start_byte = ${data.start_byte}
      data_type = ${convertDataTypeToToml(data.data_type)}
      constraint = ${convertDataConstraintSpecificationToToml(data.constraint)}
    `;
}

function convertDataTypeToToml(dataType: PrimitiveDataType) {
  if (typeof dataType === "string") {
    return `"{${dataType}}"`;
  } else if (typeof dataType === "object" && "Bytes" in dataType) {
    return `{Bytes = { length = ${dataType.Bytes.length} }}`;
  } else {
    throw new Error(
      `Unknown PrimitiveDataType variant: ${JSON.stringify(dataType)}`,
    );
  }
}

function convertDataConstraintSpecificationToToml(
  constraint: DataConstraintSpecification,
) {
  if ("LessThan" in constraint) {
    return `LessThan = ${convertPrimitiveDataValueToToml(constraint.LessThan)}`;
  } else if ("GreaterThan" in constraint) {
    return `GreaterThan = ${convertPrimitiveDataValueToToml(constraint.GreaterThan)}`;
  } else if ("EqualTo" in constraint) {
    return `EqualTo = [${constraint.EqualTo.map(convertPrimitiveDataValueToToml).join(", ")}]`;
  } else if ("Neq" in constraint) {
    return `Neq = [${constraint.Neq.map(convertPrimitiveDataValueToToml).join(", ")}]`;
  } else {
    throw new Error(
      `Unknown DataConstraintSpecification variant: ${JSON.stringify(constraint)}`,
    );
  }
}

function convertPrimitiveDataValueToToml(value: PrimitiveDataValue) {
  if ("U8" in value) {
    return `{ U8 = ${value.U8} }`;
  } else if ("U16" in value) {
    return `{ U16 = ${value.U16} }`;
  } else if ("U32" in value) {
    return `{ U32 = ${value.U32} }`;
  } else if ("U64" in value) {
    return `{ U64 = ${value.U64} }`;
  } else if ("Bool" in value) {
    return `{ Bool = ${value.Bool} }`;
  } else if ("Pubkey" in value) {
    return `{ Pubkey = "${value.Pubkey}" }`;
  } else if ("Bytes" in value) {
    return `{ Bytes = "${value.Bytes}" }`;
  } else {
    throw new Error(
      `Unknown PrimitiveDataValue variant: ${JSON.stringify(value)}`,
    );
  }
}
