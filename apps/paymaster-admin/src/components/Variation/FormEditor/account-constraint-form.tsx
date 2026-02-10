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

const createDefaultPubkey = (): ContextualPubkey =>
  ({
    Explicit: { pubkey: SystemProgram.programId.toBase58() },
  }) as ContextualPubkey;

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
          type="number"
          inputMode="numeric"
          value={String(value.index)}
          onChange={handleIndexChange}
          placeholder="0"
          aria-label="Account index"
          className={styles.narrowField ?? ""}
        />
      </div>
      <div className={styles.section ?? ""}>
        <span className={styles.sectionHeader ?? ""}>Include</span>
        <DynamicList
          items={value.include}
          onChange={handleIncludeChange}
          renderItem={(item, _index, onItemChange) => (
            <ContextualPubkeyInput value={item} onChange={onItemChange} />
          )}
          createDefault={createDefaultPubkey}
          label="include"
        />
      </div>
      <div className={styles.section ?? ""}>
        <span className={styles.sectionHeader ?? ""}>Exclude</span>
        <DynamicList
          items={value.exclude}
          onChange={handleExcludeChange}
          renderItem={(item, _index, onItemChange) => (
            <ContextualPubkeyInput value={item} onChange={onItemChange} />
          )}
          createDefault={createDefaultPubkey}
          label="exclude"
        />
      </div>
    </div>
  );
};
