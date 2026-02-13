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
  exclude: [],
  include: [],
  index: 0,
});

const createDefaultDataConstraint = (): DataConstraint => ({
  constraint: { EqualTo: [{ U8: 0 }] },
  start_byte: 0,
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
        program,
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
        <h3 className={styles.instructionTitle ?? ""}>
          Constraints for instruction {index}
        </h3>
      </div>

      <div className={styles.fieldGroup ?? ""}>
        <span className={styles.fieldLabel ?? ""}>Program Address</span>
        <TextField
          aria-label={`Instruction ${index} program`}
          onChange={handleProgramChange}
          placeholder="Program public key (Base58)"
          value={value.program}
        />
      </div>

      <div className={styles.switchRow ?? ""}>
        <Switch isSelected={value.required} onChange={handleRequiredChange}>
          Required
        </Switch>
        <Switch
          aria-label="Enable wrapped native token support"
          isSelected={value.requires_wrapped_native_tokens ?? false}
          onChange={handleWrappedNativeChange}
        >
          <span title="If enabled, the transaction can add wrapped FOGO setup/teardown instructions around this instruction.">
            Enable Wrapped Native Token Support
          </span>
        </Switch>
      </div>

      <div className={styles.section ?? ""}>
        <span className={styles.sectionHeader ?? ""}>
          Account constraints in instruction {index}
        </span>
        <DynamicList
          createDefault={createDefaultAccountConstraint}
          items={value.accounts}
          label="account constraint"
          onChange={handleAccountsChange}
          renderItem={(item, _idx, onItemChange) => (
            <AccountConstraintForm onChange={onItemChange} value={item} />
          )}
        />
      </div>

      <div className={styles.section ?? ""}>
        <span className={styles.sectionHeader ?? ""}>
          Data constraints in instruction {index}
        </span>
        <DynamicList
          createDefault={createDefaultDataConstraint}
          items={value.data}
          label="data constraint"
          onChange={handleDataChange}
          renderItem={(item, _idx, onItemChange) => (
            <DataConstraintForm onChange={onItemChange} value={item} />
          )}
        />
      </div>
    </div>
  );
};
