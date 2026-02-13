import { Button } from "@fogo/component-library/Button";
import { useToast } from "@fogo/component-library/Toast";
import { ArrowsInIcon, ArrowsOutIcon } from "@phosphor-icons/react/dist/ssr";
import { useCallback, useRef, useState } from "react";
import AceEditor from "react-ace";
import "./ace-theme.scss";
import styles from "./variation-code-block.module.scss";
import "ace-builds/src-noconflict/theme-monokai";
import "ace-builds/src-noconflict/mode-json";
import "ace-builds/src-noconflict/mode-toml";
import { useResizeObserver } from "@react-hookz/web";
import type { Variation } from "../../db-schema";
import { VariationTester } from "./variation-tester";

type VariationCodeBlockProps = {
  value: string;
  onChange: (value: string) => void;
  domain: string;
  footer?: React.ReactNode;
  mode: "toml" | "json";
  variationForTest: Variation | null;
};

export const VariationCodeBlock = ({
  value,
  onChange,
  domain,
  footer,
  mode,
  variationForTest,
}: VariationCodeBlockProps) => {
  const toast = useToast();

  const [isFullscreen, setIsFullscreen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

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
  }, [toast]);

  return (
    <div className={styles.variationCodeBlock} ref={cardRef}>
      <input name="code" type="hidden" value={value} />
      <div className={styles.variationCodeBlockHeader}>
        <h2 className={styles.variationCodeBlockHeaderTitle}>
          Edit Configuration
        </h2>
        <Button onClick={handleFullscreen} variant="outline">
          {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          {isFullscreen ? <ArrowsOutIcon /> : <ArrowsInIcon />}
        </Button>
      </div>
      <Editor mode={mode} onChange={onChange} value={value} />
      {footer && (
        <div className={styles.variationCodeBlockFooter}>{footer}</div>
      )}
      <div className={styles.variationCodeBlockTester}>
        <VariationTester domain={domain} variation={variationForTest} />
      </div>
    </div>
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
          aria-label="Variation code"
          className={styles.variationCodeBlockEditor}
          height={`${editorHeight}px`}
          mode={mode}
          onChange={onChange}
          showPrintMargin={false}
          theme="monokai"
          value={value}
          width="100%"
        />
      )}
    </div>
  );
};
