import { Switch } from "@fogo/component-library/Switch";
import { TextField } from "@fogo/component-library/TextField";
import { useCallback } from "react";
import type { z } from "zod";
import type {
  AccountConstraintSchema,
  DataConstraintSchema,
  InstructionConstraintSchema,
} from "../../../db-schema";
import { AccountConstraintForm } from "./account-constraint-form";
import { DataConstraintForm } from "./data-constraint-form";
import { DynamicList } from "./dynamic-list";
import styles from "./form-editor.module.scss";

type InstructionConstraint = z.infer<typeof InstructionConstraintSchema>;
type AccountConstraint = z.infer<typeof AccountConstraintSchema>;
type DataConstraint = z.infer<typeof DataConstraintSchema>;

const createDefaultAccountConstraint = (): AccountConstraint => ({
  index: 0,
  include: [],
  exclude: [],
});

const createDefaultDataConstraint = (): DataConstraint => ({
  start_byte: 0,
  constraint: { EqualTo: [{ U8: 0 }] },
});

type InstructionConstraintFormProps = {
  value: InstructionConstraint;
  onChange: (value: InstructionConstraint) => void;
  index: number;
};

export const InstructionConstraintForm = ({
  value,
  onChange,
  index,
}: InstructionConstraintFormProps) => {
  const handleProgramChange = useCallback(
    (program: string) => {
      onChange({
        ...value,
        program: program as InstructionConstraint["program"],
      });
    },
    [value, onChange],
  );

  const handleRequiredChange = useCallback(
    (required: boolean) => {
      onChange({ ...value, required });
    },
    [value, onChange],
  );

  const handleWrappedNativeChange = useCallback(
    (requires_wrapped_native_tokens: boolean) => {
      onChange({ ...value, requires_wrapped_native_tokens });
    },
    [value, onChange],
  );

  const handleAccountsChange = useCallback(
    (accounts: AccountConstraint[]) => {
      onChange({ ...value, accounts });
    },
    [value, onChange],
  );

  const handleDataChange = useCallback(
    (data: DataConstraint[]) => {
      onChange({ ...value, data });
    },
    [value, onChange],
  );

  return (
    <div className={styles.instructionCard ?? ""}>
      <div className={styles.instructionHeader ?? ""}>
        <h3>Instruction {index}</h3>
      </div>

      <div className={styles.fieldGroup ?? ""}>
        <span className={styles.fieldLabel ?? ""}>Program</span>
        <TextField
          value={value.program}
          onChange={handleProgramChange}
          placeholder="Program public key (Base58)"
          aria-label={`Instruction ${index} program`}
        />
      </div>

      <div className={styles.switchRow ?? ""}>
        <Switch isSelected={value.required} onChange={handleRequiredChange}>
          Required
        </Switch>
        <Switch
          isSelected={value.requires_wrapped_native_tokens ?? false}
          onChange={handleWrappedNativeChange}
        >
          Requires Wrapped Native Tokens
        </Switch>
      </div>

      <div className={styles.section ?? ""}>
        <span className={styles.sectionHeader ?? ""}>Account Constraints</span>
        <DynamicList
          items={value.accounts}
          onChange={handleAccountsChange}
          renderItem={(item, _idx, onItemChange) => (
            <AccountConstraintForm value={item} onChange={onItemChange} />
          )}
          createDefault={createDefaultAccountConstraint}
          label="account constraint"
        />
      </div>

      <div className={styles.section ?? ""}>
        <span className={styles.sectionHeader ?? ""}>Data Constraints</span>
        <DynamicList
          items={value.data}
          onChange={handleDataChange}
          renderItem={(item, _idx, onItemChange) => (
            <DataConstraintForm value={item} onChange={onItemChange} />
          )}
          createDefault={createDefaultDataConstraint}
          label="data constraint"
        />
      </div>
    </div>
  );
};
