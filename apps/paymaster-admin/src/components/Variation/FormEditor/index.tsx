import { SystemProgram } from "@solana/web3.js";
import { useCallback } from "react";
import type { z } from "zod";
import type { InstructionConstraintSchema } from "../../../db-schema";
import { DynamicList } from "./dynamic-list";
import styles from "./form-editor.module.scss";
import { InstructionConstraintForm } from "./instruction-constraint-form";

type InstructionConstraint = z.infer<typeof InstructionConstraintSchema>;

const SYSTEM_PROGRAM_ID = SystemProgram.programId.toBase58();

const createDefaultInstruction = (): InstructionConstraint => ({
  accounts: [],
  data: [],
  program: SYSTEM_PROGRAM_ID,
  required: true,
  requires_wrapped_native_tokens: false,
});

type VariationFormEditorProps = {
  instructions: InstructionConstraint[];
  onChange: (instructions: InstructionConstraint[]) => void;
};

export const VariationFormEditor = ({
  instructions,
  onChange,
}: VariationFormEditorProps) => {
  const renderInstruction = useCallback(
    (
      item: InstructionConstraint,
      index: number,
      onItemChange: (value: InstructionConstraint) => void,
    ) => (
      <InstructionConstraintForm
        index={index}
        onChange={onItemChange}
        value={item}
      />
    ),
    [],
  );

  return (
    <div className={styles.formEditor ?? ""}>
      {instructions.length === 0 && (
        <p className={styles.emptyState ?? ""}>
          No instructions supported for this transaction variation yet. Add one
          to get started.
        </p>
      )}
      <DynamicList
        createDefault={createDefaultInstruction}
        items={instructions}
        label="instruction constraint"
        onChange={onChange}
        renderItem={renderInstruction}
      />
    </div>
  );
};
