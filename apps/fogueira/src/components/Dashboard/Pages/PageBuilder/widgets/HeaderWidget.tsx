"use client";
import {
  TextB,
  TextItalic,
  TextUnderline,
  TextAlignLeft,
  TextAlignCenter,
  TextAlignRight,
  Palette,
} from "@phosphor-icons/react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Underline from "@tiptap/extension-underline";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import { useEffect, useState, useRef } from "react";
import styles from "./HeaderWidget.module.scss";

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

const HEADER_LEVELS = [1, 2, 3, 4, 5, 6] as const;

export const HeaderWidget = ({ config, onUpdate }: Props) => {
  const content = typeof config.content === "string" ? config.content : "";
  const level = typeof config.level === "number" ? config.level : 1;
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const colorPickerRef = useRef<HTMLDivElement>(null);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: {
            levels: [1, 2, 3, 4, 5, 6],
          },
        }),
        TextAlign.configure({
          types: ["heading"],
        }),
        Underline,
        TextStyle,
        Color,
      ],
      content: content || `<h${level}></h${level}>`,
      immediatelyRender: false,
      onUpdate: ({ editor: e }) => {
        onUpdate({
          ...config,
          content: e.getHTML(),
        });
      },
      onFocus: () => setIsFocused(true),
      onBlur: () => {
        setTimeout(() => setIsFocused(false), 200);
      },
      editorProps: {
        attributes: {
          class: styles.editor ?? "",
        },
      },
    },
    [level],
  );

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || `<h${level}></h${level}>`);
    }
  }, [content, editor, level]);

  useEffect(() => {
    if (editor && level) {
      // Convert current content to the selected heading level
      const currentContent = editor.getText();
      if (currentContent) {
        editor.commands.setHeading({ level: level as 1 | 2 | 3 | 4 | 5 | 6 });
      }
    }
  }, [level, editor]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        colorPickerRef.current &&
        !colorPickerRef.current.contains(e.target as Node)
      ) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!editor) {
    return null;
  }

  const handleLevelChange = (newLevel: number) => {
    onUpdate({
      ...config,
      level: newLevel,
    });
    if (editor) {
      editor.commands.setHeading({ level: newLevel as 1 | 2 | 3 | 4 | 5 | 6 });
    }
  };

  return (
    <div className={styles.widget}>
      <div className={`${styles.toolbar} ${isFocused ? styles.visible : ""}`}>
        <div className={styles.levelSelector}>
          {HEADER_LEVELS.map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => handleLevelChange(lvl)}
              className={`${styles.levelButton} ${level === lvl ? styles.active : ""}`}
              title={`Heading ${lvl}`}
            >
              H{lvl}
            </button>
          ))}
        </div>

        <div className={styles.separator} />

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
      </div>

      <EditorContent editor={editor} />
    </div>
  );
};

