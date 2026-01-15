import { Button } from "@fogo/component-library/Button";
import {
  ArrowsInIcon,
  ArrowsOutIcon,
  ChecksIcon,
  SpinnerIcon,
} from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import AceEditor from "react-ace";
import styles from "./variation-code-block.module.scss";
import "ace-builds/src-noconflict/theme-monokai";
import "./ace-theme.scss";
import { Badge } from "@fogo/component-library/Badge";
import { useToast } from "@fogo/component-library/Toast";

type VariationCodeBlockProps = {
  value: string;
  onChange: (value: string) => void;
  isExpanded: boolean;
  footer: React.ReactNode;
};

export const VariationCodeBlock = ({
  value,
  onChange,
  isExpanded,
  footer,
}: VariationCodeBlockProps) => {
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
  }, [toast.error]);

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
          <input type="hidden" name="code" value={value} />
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
                value={value}
                onChange={onChange}
                className={styles.variationCodeBlockEditor}
                mode="toml"
                theme="monokai"
                width="100%"
                height={`${editorHeight}px`}
                showPrintMargin={false}
              />
            )}
          </div>
          <div className={styles.variationCodeBlockFooter}>{footer}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
