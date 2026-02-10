import { SystemProgram } from "@solana/web3.js";
import { useCallback } from "react";
import type { z } from "zod";
import type { InstructionConstraintSchema } from "../../../db-schema";
import { DynamicList } from "./dynamic-list";
import styles from "./form-editor.module.scss";
import { InstructionConstraintForm } from "./instruction-constraint-form";

type InstructionConstraint = z.infer<typeof InstructionConstraintSchema>;

const SYSTEM_PROGRAM_ID = SystemProgram.programId.toBase58() as InstructionConstraint["program"];

const createDefaultInstruction = (): InstructionConstraint => ({
  program: SYSTEM_PROGRAM_ID,
  required: true,
  accounts: [],
  data: [],
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
        value={item}
        onChange={onItemChange}
        index={index}
      />
    ),
    [],
  );

  return (
    <div className={styles.formEditor ?? ""}>
      {instructions.length === 0 && (
        <p className={styles.emptyState ?? ""}>
          No instructions yet. Add one to get started.
        </p>
      )}
      <DynamicList
        items={instructions}
        onChange={onChange}
        renderItem={renderInstruction}
        createDefault={createDefaultInstruction}
        label="instruction"
      />
    </div>
  );
};
