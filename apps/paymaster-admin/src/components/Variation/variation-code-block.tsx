import { Button } from "@fogo/component-library/Button";
import { useToast } from "@fogo/component-library/Toast";
import { ArrowsInIcon, ArrowsOutIcon, ChecksIcon } from "@phosphor-icons/react/dist/ssr";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useRef, useState } from "react";
import AceEditor from "react-ace";
import "./ace-theme.scss";
import styles from "./variation-code-block.module.scss";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-toml";
import type { Variation } from "../../db-schema";
import { Badge } from "@fogo/component-library/Badge";
import { useResizeObserver } from "@react-hookz/web";
import { VariationTester } from "./variation-tester";

type VariationCodeBlockProps = {
  value: string;
  onChange: (value: string) => void;
  isExpanded: boolean;
  domain: string;
  variation: Variation;
  footer?: React.ReactNode;
  mode: "toml" | "json";
};

export const VariationCodeBlock = ({
  value,
  onChange,
  isExpanded,
  domain,
  variation,
  footer,
  mode,
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
          <Editor
            onChange={onChange}
            value={value}
            mode={mode}
          />
          {footer && (
            <>
              <div className={styles.variationCodeBlockFooter}>
                <div className={styles.variationCodeBlockFooterInfo}>
                  <Badge variant="success" size="xs">
                    Valid format <ChecksIcon />
                  </Badge>
                </div>
                <div className={styles.variationCodeBlockFooterButtons}>
                  <Button variant="secondary">Save</Button>
                </div>
              </div>
              <div className={styles.variationCodeBlockTester}>
                {/* TODO: currently the variation input is disconnected from the code editor. We should figure out the right way to connect these. */}
                <VariationTester domain={domain} variation={variation} />
              </div>
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

type EditorProps = {
  value: string;
  onChange: (value: string) => void;
  mode: "toml" | "json";
};

const Editor = ({ value, onChange, mode }: EditorProps) => {
  const contentRef = useRef<HTMLDivElement>(null);
  const [editorHeight, setEditorHeight] = useState(0);

  const handleUpdate = useCallback(() => {
    setEditorHeight(contentRef.current?.clientHeight ?? 0);
  }, []);

  useResizeObserver(contentRef, handleUpdate);

  return (
    <div className={styles.variationCodeBlockContent} ref={contentRef}>
      {contentRef.current && (
        <AceEditor
          value={value}
          onChange={onChange}
          className={styles.variationCodeBlockEditor}
          mode={mode}
          theme="monokai"
          width="100%"
          height={`${editorHeight}px`}
          showPrintMargin={false}
          aria-label="Variation code"
        />
      )}
    </div>
  );
};
