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
      <Select<ValueType>
        aria-label="Value type"
        className={styles.selectField ?? ""}
        isDisabled={disableTypeSelector ?? false}
        items={typeItems}
        onSelectionChange={(key) => handleTypeChange(key as ValueType)}
        selectedKey={valueType}
      />
      <ValueInput onChange={onChange} value={value} valueType={valueType} />
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
          aria-label="U8 value"
          className={styles.narrowField ?? ""}
          inputMode="numeric"
          onChange={(v) =>
            onChange({ U8: Math.min(255, Math.max(0, Number(v) || 0)) })
          }
          placeholder="0-255"
          type="number"
          value={String("U8" in value ? value.U8 : 0)}
        />
      );
    case "U16":
      return (
        <TextField
          aria-label="U16 value"
          className={styles.narrowField ?? ""}
          inputMode="numeric"
          onChange={(v) =>
            onChange({ U16: Math.min(65_535, Math.max(0, Number(v) || 0)) })
          }
          placeholder="0-65535"
          type="number"
          value={String("U16" in value ? value.U16 : 0)}
        />
      );
    case "U32":
      return (
        <TextField
          aria-label="U32 value"
          className={styles.narrowField ?? ""}
          inputMode="numeric"
          onChange={(v) =>
            onChange({
              U32: Math.min(0xff_ff_ff_ff, Math.max(0, Number(v) || 0)),
            })
          }
          placeholder="0-4294967295"
          type="number"
          value={String("U32" in value ? value.U32 : 0)}
        />
      );
    case "U64":
      return (
        <TextField
          aria-label="U64 value"
          className={styles.narrowField ?? ""}
          inputMode="numeric"
          onChange={(v) =>
            onChange({
              U64: Math.min(
                Number.MAX_SAFE_INTEGER,
                Math.max(0, Number(v) || 0),
              ),
            })
          }
          placeholder="0"
          type="number"
          value={String("U64" in value ? value.U64 : 0)}
        />
      );
    case "Bool":
      return (
        <Select<"true" | "false">
          aria-label="Bool value"
          className={styles.selectField ?? ""}
          items={[
            { key: "true", label: "true" },
            { key: "false", label: "false" },
          ]}
          onSelectionChange={(key) => onChange({ Bool: key === "true" })}
          selectedKey={("Bool" in value ? value.Bool : true) ? "true" : "false"}
        />
      );
    case "Pubkey":
      return (
        <TextField
          aria-label="Pubkey value"
          className={styles.pubkeyField ?? ""}
          onChange={(v) => onChange({ Pubkey: v })}
          placeholder="Base58 public key"
          value={"Pubkey" in value ? value.Pubkey : ""}
        />
      );
    case "Bytes":
      return (
        <TextField
          aria-label="Bytes value"
          className={styles.pubkeyField ?? ""}
          onChange={(v) => onChange({ Bytes: v })}
          placeholder="Hex string (e.g. f34bae8)"
          value={"Bytes" in value ? value.Bytes : ""}
        />
      );
    case "NttSignedQuoter":
      return (
        <TextField
          aria-label="NttSignedQuoter value"
          className={styles.pubkeyField ?? ""}
          onChange={(v) => onChange({ NttSignedQuoter: v })}
          placeholder="0x-prefixed 20-byte hex (e.g. 0x5241...)"
          value={"NttSignedQuoter" in value ? value.NttSignedQuoter : ""}
        />
      );
  }
};
