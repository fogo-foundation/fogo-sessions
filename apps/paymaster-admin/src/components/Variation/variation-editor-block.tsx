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
  networkEnvironment: string;
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
  networkEnvironment,
  variationForTest,
  footer,
}: VariationEditorBlockProps) => {
  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          animate={{ height: "50vh", scale: 1 }}
          className={styles.variationEditorBlock}
          exit={{ height: 0, scale: 0.95 }}
          initial={{ height: 0, scale: 0.95 }}
        >
          {editorMode === "form" && isV1 ? (
            <VariationFormBlock
              domain={domain}
              footer={footer}
              instructions={instructions}
              networkEnvironment={networkEnvironment}
              onChange={onInstructionsChange}
              variationForTest={variationForTest}
            />
          ) : (
            <VariationCodeBlock
              domain={domain}
              footer={footer}
              mode={codeMode}
              networkEnvironment={networkEnvironment}
              onChange={onCodeChange}
              value={code}
              variationForTest={variationForTest}
            />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
