import { Select } from "@fogo/component-library/Select";
import { TextField } from "@fogo/component-library/TextField";
import { SystemProgram } from "@solana/web3.js";
import { useCallback } from "react";
import type { z } from "zod";
import type { ContextualPubkeySchema } from "../../../db-schema";
import styles from "./form-editor.module.scss";

type ContextualPubkey = z.infer<typeof ContextualPubkeySchema>;

type PubkeyVariant =
  | "Sponsor"
  | "NonFeePayerSigner"
  | "DomainRegistry"
  | "Explicit";

const PUBKEY_VARIANT_ITEMS: Array<{ key: PubkeyVariant; label: string }> = [
  { key: "Sponsor", label: "Sponsor" },
  { key: "NonFeePayerSigner", label: "NonFeePayerSigner" },
  { key: "DomainRegistry", label: "DomainRegistry" },
  { key: "Explicit", label: "Explicit" },
];

function getVariant(value: ContextualPubkey): PubkeyVariant {
  if (typeof value === "string") return value;
  if (typeof value === "object" && "Explicit" in value) return "Explicit";
  return "Sponsor";
}

function getExplicitPubkey(value: ContextualPubkey): string {
  if (typeof value === "object" && "Explicit" in value) {
    return value.Explicit.pubkey;
  }
  return "";
}

type ContextualPubkeyInputProps = {
  value: ContextualPubkey;
  onChange: (value: ContextualPubkey) => void;
};

export const ContextualPubkeyInput = ({
  value,
  onChange,
}: ContextualPubkeyInputProps) => {
  const variant = getVariant(value);

  const handleVariantChange = useCallback(
    (key: PubkeyVariant) => {
      if (key === "Explicit") {
        onChange({
          Explicit: { pubkey: SystemProgram.programId.toBase58() },
        } as ContextualPubkey);
      } else {
        onChange(key);
      }
    },
    [onChange],
  );

  const handlePubkeyChange = useCallback(
    (pubkey: string) => {
      onChange({ Explicit: { pubkey } } as ContextualPubkey);
    },
    [onChange],
  );

  return (
    <div className={styles.constraintRow ?? ""}>
      <Select<PubkeyVariant>
        items={PUBKEY_VARIANT_ITEMS}
        selectedKey={variant}
        onSelectionChange={(key) => handleVariantChange(key as PubkeyVariant)}
        aria-label="Pubkey type"
        className={styles.selectField ?? ""}
      />
      {variant === "Explicit" && (
        <TextField
          value={getExplicitPubkey(value)}
          onChange={handlePubkeyChange}
          placeholder="Base58 public key"
          aria-label="Explicit pubkey"
          className={styles.pubkeyField ?? ""}
        />
      )}
    </div>
  );
};
