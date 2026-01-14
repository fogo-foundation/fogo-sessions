import { Button } from "@fogo/component-library/Button";
import {
  ArrowsInIcon,
  ArrowsOutIcon,
  ChecksIcon,
} from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import AceEditor from "react-ace";
import type { Variation } from "../../db-schema";
import styles from "./variation-code-block.module.scss";
import "ace-builds/src-noconflict/theme-monokai";
import "./ace-theme.scss";
import { Badge } from "@fogo/component-library/Badge";
import { useToast } from "@fogo/component-library/Toast";

export const VariationCodeBlock = ({
  value,
  onChange,
  isExpanded,
  variation,
}: {
  value: string;
  onChange: (value: string) => void;
  isExpanded: boolean;
  variation: Variation;
}) => {
  const toast = useToast();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = useState(0);

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
      return;
    }
    // Otherwise enter fullscreen mode
    cardRef.current
      ?.requestFullscreen()
      .then(() => {
        setIsFullscreen(true);
      })
      .catch((err) => {
        toast.error(`Error enabling fullscreen: ${err.message}`);
      });
  }, [isFullscreen, toast.error]);

  const handleUpdate = useCallback(() => {
    setEditorHeight(contentRef.current?.clientHeight ?? 0);
  }, []);

  return (
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, scale: 0.95 }}
          animate={{ height: "50vh", scale: 1 }}
          exit={{ height: 0, scale: 0.95 }}
          className={styles.variationCodeBlock}
          ref={cardRef}
          onUpdate={handleUpdate}
        >
          <div className={styles.variationCodeBlockHeader}>
            <h2 className={styles.variationCodeBlockHeaderTitle}>
              Edit Configuration
            </h2>
            <Button variant="outline" onClick={handleFullscreen}>
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              {isFullscreen ? <ArrowsOutIcon /> : <ArrowsInIcon />}
            </Button>
          </div>
          <div className={styles.variationCodeBlockContent} ref={contentRef}>
            {contentRef.current && (
              <AceEditor
                name={variation.id}
                value={value}
                onChange={onChange}
                className={styles.variationCodeBlockEditor}
                mode="javascript"
                theme="monokai"
                width="100%"
                height={`${editorHeight}px`}
                showPrintMargin={false}
              />
            )}
          </div>
          <div className={styles.variationCodeBlockFooter}>
            <div className={styles.variationCodeBlockFooterInfo}>
              <Badge variant="success" size="xs">
                All passed <ChecksIcon />
              </Badge>
            </div>
            <div className={styles.variationCodeBlockFooterButtons}>
              <Button variant="secondary">Save</Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
