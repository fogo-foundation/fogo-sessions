import { AnimatePresence, motion } from "motion/react";
import type { z } from "zod";
import type { InstructionConstraintSchema, Variation } from "../../db-schema";
import { VariationFormEditor } from "./FormEditor";
import { VariationTester } from "./variation-tester";
import styles from "./variations-list-item.module.scss";

type InstructionConstraint = z.infer<typeof InstructionConstraintSchema>;

type VariationFormBlockProps = {
  isExpanded: boolean;
  instructions: InstructionConstraint[];
  onChange: (instructions: InstructionConstraint[]) => void;
  domain: string;
  variationForTest: Variation | null;
  footer?: React.ReactNode;
};

export const VariationFormBlock = ({
  isExpanded,
  instructions,
  onChange,
  domain,
  variationForTest,
  footer,
}: VariationFormBlockProps) => {
  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, scale: 0.95 }}
          animate={{ height: "50vh", scale: 1 }}
          exit={{ height: 0, scale: 0.95 }}
          className={styles.variationFormEditorContainer}
        >
          <VariationFormEditor
            instructions={instructions}
            onChange={onChange}
          />
          {footer && (
            <div className={styles.variationFormEditorFooter}>{footer}</div>
          )}
          <div className={styles.variationFormEditorTester}>
            <VariationTester domain={domain} variation={variationForTest} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
