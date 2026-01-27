"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import {
  TextB,
  TextItalic,
  TextUnderline,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  Palette,
  HighlighterCircle,
} from "@phosphor-icons/react";
import { useEffect, useState, useRef } from "react";
import styles from "./TextWidget.module.scss";

type Props = {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
};

const TEXT_COLORS = [
  "#ffffff",
  "#a3a3a3",
  "#ff5227",
  "#ff9500",
  "#ffd60a",
  "#34c759",
  "#66ceff",
  "#5856d6",
  "#ff2d55",
];

const HIGHLIGHT_COLORS = [
  "transparent",
  "#ff522730",
  "#ff950030",
  "#ffd60a30",
  "#34c75930",
  "#66ceff30",
  "#5856d630",
  "#ff2d5530",
];

export const TextWidget = ({ config, onUpdate }: Props) => {
  const content = typeof config.content === "string" ? config.content : "";
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor(
    {
      extensions: [
        StarterKit,
        Placeholder.configure({
          placeholder: "Type something...",
        }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        Underline,
        TextStyle,
        Color,
        Highlight.configure({
          multicolor: true,
        }),
      ],
      content,
      immediatelyRender: false,
      onUpdate: ({ editor: e }) => {
        onUpdate({
          ...config,
          content: e.getHTML(),
        });
      },
      onFocus: () => setIsFocused(true),
      onBlur: () => {
        // Delay to allow button clicks to register
        setTimeout(() => setIsFocused(false), 200);
      },
      editorProps: {
        attributes: {
          class: styles.editor ?? "",
        },
      },
    },
    [],
  );

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node)
      ) {
        setShowColorPicker(false);
        setShowHighlightPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!editor) {
    return null;
  }

  return (
    <div className={styles.widget}>
      <div className={`${styles.toolbar} ${isFocused ? styles.visible : ""}`}>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${styles.menuButton} ${editor.isActive("bold") ? styles.active : ""}`}
          title="Bold"
        >
          <TextB weight="bold" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${styles.menuButton} ${editor.isActive("italic") ? styles.active : ""}`}
          title="Italic"
        >
          <TextItalic weight="bold" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className={`${styles.menuButton} ${editor.isActive("underline") ? styles.active : ""}`}
          title="Underline"
        >
          <TextUnderline weight="bold" />
        </button>

        <div className={styles.separator} />

        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          className={`${styles.menuButton} ${editor.isActive({ textAlign: "left" }) ? styles.active : ""}`}
          title="Align Left"
        >
          <TextAlignLeft weight="bold" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          className={`${styles.menuButton} ${editor.isActive({ textAlign: "center" }) ? styles.active : ""}`}
          title="Align Center"
        >
          <TextAlignCenter weight="bold" />
        </button>
        <button
          type="button"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          className={`${styles.menuButton} ${editor.isActive({ textAlign: "right" }) ? styles.active : ""}`}
          title="Align Right"
        >
          <TextAlignRight weight="bold" />
        </button>

        <div className={styles.separator} />

        <div className={styles.colorPickerWrapper} ref={colorPickerRef}>
          <button
            type="button"
            onClick={() => {
              setShowColorPicker(!showColorPicker);
              setShowHighlightPicker(false);
            }}
            className={styles.menuButton}
            title="Text Color"
          >
            <Palette weight="bold" />
          </button>
          {showColorPicker && (
            <div className={styles.colorPicker}>
              {TEXT_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={styles.colorSwatch}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    editor.chain().focus().setColor(color).run();
                    setShowColorPicker(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className={styles.colorPickerWrapper}>
          <button
            type="button"
            onClick={() => {
              setShowHighlightPicker(!showHighlightPicker);
              setShowColorPicker(false);
            }}
            className={styles.menuButton}
            title="Highlight"
          >
            <HighlighterCircle weight="bold" />
          </button>
          {showHighlightPicker && (
            <div className={styles.colorPicker}>
              {HIGHLIGHT_COLORS.map((color, i) => (
                <button
                  key={i}
                  type="button"
                  className={`${styles.colorSwatch} ${color === "transparent" ? styles.noColor : ""}`}
                  style={{
                    backgroundColor:
                      color === "transparent" ? "#333" : color,
                  }}
                  onClick={() => {
                    if (color === "transparent") {
                      editor.chain().focus().unsetHighlight().run();
                    } else {
                      editor.chain().focus().setHighlight({ color }).run();
                    }
                    setShowHighlightPicker(false);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
};
