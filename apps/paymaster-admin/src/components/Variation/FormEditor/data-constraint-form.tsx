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
        <span className={styles.fieldLabel ?? ""}>Start Byte Index</span>
        <TextField
          aria-label="Start byte index"
          className={styles.narrowField ?? ""}
          inputMode="numeric"
          onChange={handleStartByteChange}
          placeholder="0"
          type="number"
          value={String(value.start_byte)}
        />
      </div>
      <DataConstraintSpecInput
        onChange={(constraint) => onChange({ ...value, constraint })}
        value={value.constraint}
      />
    </div>
  );
};
