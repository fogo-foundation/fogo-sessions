import { TextField } from "@fogo/component-library/TextField";
import { SystemProgram } from "@solana/web3.js";
import { useCallback } from "react";
import type { z } from "zod";
import type {
  AccountConstraintSchema,
  ContextualPubkeySchema,
} from "../../../db-schema";
import { ContextualPubkeyInput } from "./contextual-pubkey-input";
import { DynamicList } from "./dynamic-list";
import styles from "./form-editor.module.scss";

type AccountConstraint = z.infer<typeof AccountConstraintSchema>;
type ContextualPubkey = z.infer<typeof ContextualPubkeySchema>;

const createDefaultPubkey = (): ContextualPubkey => ({
  Explicit: { pubkey: SystemProgram.programId.toBase58() },
});

type AccountConstraintFormProps = {
  value: AccountConstraint;
  onChange: (value: AccountConstraint) => void;
};

export const AccountConstraintForm = ({
  value,
  onChange,
}: AccountConstraintFormProps) => {
  const handleIndexChange = useCallback(
    (v: string) => {
      onChange({ ...value, index: Math.max(0, Number(v) || 0) });
    },
    [value, onChange],
  );

  const handleIncludeChange = useCallback(
    (include: ContextualPubkey[]) => {
      onChange({ ...value, include });
    },
    [value, onChange],
  );

  const handleExcludeChange = useCallback(
    (exclude: ContextualPubkey[]) => {
      onChange({ ...value, exclude });
    },
    [value, onChange],
  );

  return (
    <div className={styles.nestedCard ?? ""}>
      <div className={styles.fieldGroup ?? ""}>
        <span className={styles.fieldLabel ?? ""}>Account Index</span>
        <TextField
          aria-label="Account index"
          className={styles.narrowField ?? ""}
          inputMode="numeric"
          onChange={handleIndexChange}
          placeholder="0"
          type="number"
          value={String(value.index)}
        />
      </div>
      <div className={styles.section ?? ""}>
        <span className={styles.sectionHeader ?? ""}>Must be one of</span>
        <DynamicList
          createDefault={createDefaultPubkey}
          items={value.include}
          label="account to match"
          onChange={handleIncludeChange}
          renderItem={(item, _index, onItemChange) => (
            <ContextualPubkeyInput onChange={onItemChange} value={item} />
          )}
        />
      </div>
      <div className={styles.section ?? ""}>
        <span className={styles.sectionHeader ?? ""}>Must not be one of</span>
        <DynamicList
          createDefault={createDefaultPubkey}
          items={value.exclude}
          label="account to not match"
          onChange={handleExcludeChange}
          renderItem={(item, _index, onItemChange) => (
            <ContextualPubkeyInput onChange={onItemChange} value={item} />
          )}
        />
      </div>
    </div>
  );
};
