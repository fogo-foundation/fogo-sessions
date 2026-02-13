import { AnimatePresence, motion } from "motion/react";
import type { z } from "zod";
import type { InstructionConstraintSchema, Variation } from "../../db-schema";
import { VariationCodeBlock } from "./variation-code-block";
import { VariationFormBlock } from "./variation-form-block";
import styles from "./variations-list-item.module.scss";

type InstructionConstraint = z.infer<typeof InstructionConstraintSchema>;

type VariationEditorBlockProps = {
  isExpanded: boolean;
  editorMode: "form" | "code";
  isV1: boolean;
  instructions: InstructionConstraint[];
  onInstructionsChange: (instructions: InstructionConstraint[]) => void;
  code: string;
  onCodeChange: (value: string) => void;
  codeMode: "toml" | "json";
  domain: string;
  variationForTest: Variation | null;
  footer?: React.ReactNode;
};

export const VariationEditorBlock = ({
  isExpanded,
  editorMode,
  isV1,
  instructions,
  onInstructionsChange,
  code,
  onCodeChange,
  codeMode,
  domain,
  variationForTest,
  footer,
}: VariationEditorBlockProps) => {
  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, scale: 0.95 }}
          animate={{ height: "50vh", scale: 1 }}
          exit={{ height: 0, scale: 0.95 }}
          className={styles.variationEditorBlock}
        >
          {editorMode === "form" && isV1 ? (
            <VariationFormBlock
              instructions={instructions}
              onChange={onInstructionsChange}
              domain={domain}
              variationForTest={variationForTest}
              footer={footer}
            />
          ) : (
            <VariationCodeBlock
              mode={codeMode}
              value={code}
              onChange={onCodeChange}
              domain={domain}
              variationForTest={variationForTest}
              footer={footer}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
