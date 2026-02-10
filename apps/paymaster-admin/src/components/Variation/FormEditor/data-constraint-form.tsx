import { TextField } from "@fogo/component-library/TextField";
import { useCallback } from "react";
import type { z } from "zod";
import type { DataConstraintSchema } from "../../../db-schema";
import { DataConstraintSpecInput } from "./data-constraint-spec-input";
import styles from "./form-editor.module.scss";

type DataConstraint = z.infer<typeof DataConstraintSchema>;

type DataConstraintFormProps = {
  value: DataConstraint;
  onChange: (value: DataConstraint) => void;
};

export const DataConstraintForm = ({
  value,
  onChange,
}: DataConstraintFormProps) => {
  const handleStartByteChange = useCallback(
    (v: string) => {
      onChange({ ...value, start_byte: Math.max(0, Number(v) || 0) });
    },
    [value, onChange],
  );

  return (
    <div className={styles.nestedCard ?? ""}>
      <div className={styles.fieldGroup ?? ""}>
        <span className={styles.fieldLabel ?? ""}>Start Byte</span>
        <TextField
          type="number"
          inputMode="numeric"
          value={String(value.start_byte)}
          onChange={handleStartByteChange}
          placeholder="0"
          aria-label="Start byte"
          className={styles.narrowField ?? ""}
        />
      </div>
      <DataConstraintSpecInput
        value={value.constraint}
        onChange={(constraint) => onChange({ ...value, constraint })}
      />
    </div>
  );
};
