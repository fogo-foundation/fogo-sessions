import { Select } from "@fogo/component-library/Select";
import { TextField } from "@fogo/component-library/TextField";
import { SystemProgram } from "@solana/web3.js";
import { useCallback } from "react";
import type { z } from "zod";
import type { PrimitiveDataValueSchema } from "../../../db-schema";
import styles from "./form-editor.module.scss";

export type PrimitiveDataValue = z.infer<typeof PrimitiveDataValueSchema>;

export type ValueType =
  | "U8"
  | "U16"
  | "U32"
  | "U64"
  | "Bool"
  | "Pubkey"
  | "Bytes"
  | "NttSignedQuoter";

export const ALL_VALUE_TYPE_ITEMS: Array<{ key: ValueType; label: string }> = [
  { key: "U8", label: "U8" },
  { key: "U16", label: "U16" },
  { key: "U32", label: "U32" },
  { key: "U64", label: "U64" },
  { key: "Bool", label: "Bool" },
  { key: "Pubkey", label: "Pubkey" },
  { key: "Bytes", label: "Bytes" },
  { key: "NttSignedQuoter", label: "NttSignedQuoter" },
];

const INTEGER_VALUE_TYPE_ITEMS: Array<{ key: ValueType; label: string }> = [
  { key: "U8", label: "U8" },
  { key: "U16", label: "U16" },
  { key: "U32", label: "U32" },
  { key: "U64", label: "U64" },
];

function getValueType(value: PrimitiveDataValue): ValueType {
  if ("U8" in value) return "U8";
  if ("U16" in value) return "U16";
  if ("U32" in value) return "U32";
  if ("U64" in value) return "U64";
  if ("Bool" in value) return "Bool";
  if ("Pubkey" in value) return "Pubkey";
  if ("Bytes" in value) return "Bytes";
  if ("NttSignedQuoter" in value) return "NttSignedQuoter";
  return "Bytes";
}

export function getDefaultForType(type: ValueType): PrimitiveDataValue {
  switch (type) {
    case "U8":
      return { U8: 0 };
    case "U16":
      return { U16: 0 };
    case "U32":
      return { U32: 0 };
    case "U64":
      return { U64: 0 };
    case "Bool":
      return { Bool: true };
    case "Pubkey":
      // Cast needed: empty string will be validated by Zod on submit
      return {
        Pubkey: SystemProgram.programId.toBase58(),
      };
    case "Bytes":
      return { Bytes: "" };
    case "NttSignedQuoter":
      return { NttSignedQuoter: "" };
  }
}

type PrimitiveDataValueInputProps = {
  value: PrimitiveDataValue;
  onChange: (value: PrimitiveDataValue) => void;
  integerOnly?: boolean;
  disableTypeSelector?: boolean;
};

export const PrimitiveDataValueInput = ({
  value,
  onChange,
  integerOnly,
  disableTypeSelector,
}: PrimitiveDataValueInputProps) => {
  const valueType = getValueType(value);

  const handleTypeChange = useCallback(
    (key: ValueType) => {
      onChange(getDefaultForType(key));
    },
    [onChange],
  );

  const typeItems = integerOnly
    ? INTEGER_VALUE_TYPE_ITEMS
    : ALL_VALUE_TYPE_ITEMS;

  return (
    <div className={styles.constraintRow ?? ""}>
      <div
        className={
          disableTypeSelector && false ? (styles.disabledSelect ?? "") : undefined
        }
      >
        <Select<ValueType>
          isDisabled={disableTypeSelector ? true : false}
          items={typeItems}
          selectedKey={valueType}
          onSelectionChange={(key) => handleTypeChange(key as ValueType)}
          aria-label="Value type"
          className={styles.selectField ?? ""}
        />
      </div>
      <ValueInput value={value} valueType={valueType} onChange={onChange} />
    </div>
  );
};

type ValueInputProps = {
  value: PrimitiveDataValue;
  valueType: ValueType;
  onChange: (value: PrimitiveDataValue) => void;
};

const ValueInput = ({ value, valueType, onChange }: ValueInputProps) => {
  switch (valueType) {
    case "U8":
      return (
        <TextField
          type="number"
          inputMode="numeric"
          value={String("U8" in value ? value.U8 : 0)}
          onChange={(v) =>
            onChange({ U8: Math.min(255, Math.max(0, Number(v) || 0)) })
          }
          placeholder="0-255"
          aria-label="U8 value"
          className={styles.narrowField ?? ""}
        />
      );
    case "U16":
      return (
        <TextField
          type="number"
          inputMode="numeric"
          value={String("U16" in value ? value.U16 : 0)}
          onChange={(v) =>
            onChange({ U16: Math.min(65_535, Math.max(0, Number(v) || 0)) })
          }
          placeholder="0-65535"
          aria-label="U16 value"
          className={styles.narrowField ?? ""}
        />
      );
    case "U32":
      return (
        <TextField
          type="number"
          inputMode="numeric"
          value={String("U32" in value ? value.U32 : 0)}
          onChange={(v) =>
            onChange({
              U32: Math.min(0xff_ff_ff_ff, Math.max(0, Number(v) || 0)),
            })
          }
          placeholder="0-4294967295"
          aria-label="U32 value"
          className={styles.narrowField ?? ""}
        />
      );
    case "U64":
      return (
        <TextField
          type="number"
          inputMode="numeric"
          value={String("U64" in value ? value.U64 : 0)}
          onChange={(v) =>
            onChange({
              U64: Math.min(
                Number.MAX_SAFE_INTEGER,
                Math.max(0, Number(v) || 0),
              ),
            })
          }
          placeholder="0"
          aria-label="U64 value"
          className={styles.narrowField ?? ""}
        />
      );
    case "Bool":
      return (
        <Select<"true" | "false">
          items={[
            { key: "true", label: "true" },
            { key: "false", label: "false" },
          ]}
          selectedKey={("Bool" in value ? value.Bool : true) ? "true" : "false"}
          onSelectionChange={(key) => onChange({ Bool: key === "true" })}
          aria-label="Bool value"
          className={styles.selectField ?? ""}
        />
      );
    case "Pubkey":
      return (
        <TextField
          value={"Pubkey" in value ? value.Pubkey : ""}
          onChange={(v) => onChange({ Pubkey: v })}
          placeholder="Base58 public key"
          aria-label="Pubkey value"
          className={styles.pubkeyField ?? ""}
        />
      );
    case "Bytes":
      return (
        <TextField
          value={"Bytes" in value ? value.Bytes : ""}
          onChange={(v) => onChange({ Bytes: v })}
          placeholder="Hex string (e.g. f34bae8)"
          aria-label="Bytes value"
          className={styles.pubkeyField ?? ""}
        />
      );
    case "NttSignedQuoter":
      return (
        <TextField
          value={"NttSignedQuoter" in value ? value.NttSignedQuoter : ""}
          onChange={(v) => onChange({ NttSignedQuoter: v })}
          placeholder="0x-prefixed 20-byte hex (e.g. 0x5241...)"
          aria-label="NttSignedQuoter value"
          className={styles.pubkeyField ?? ""}
        />
      );
  }
};
