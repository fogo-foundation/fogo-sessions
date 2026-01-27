"use client";
import { X } from "@phosphor-icons/react";
import styles from "./SettingsPanel.module.scss";

type Widget = {
  id: string;
  widgetType: string;
  config: Record<string, unknown>;
  orderIndex: number;
  gatingRuleId: string | null;
};

type Props = {
  widget: Widget | null;
  onUpdate: (config: Record<string, unknown>) => void;
  onClose: () => void;
};

export const SettingsPanel = ({ widget, onUpdate, onClose }: Props) => {
  if (!widget) return null;

  const config = widget.config;

  const renderSettings = () => {
    switch (widget.widgetType) {
      case "text":
        return (
          <div className={styles.settingsGroup}>
            <p className={styles.hint}>
              Select text in the editor to format it. Use the toolbar for bold,
              italic, underline, alignment, and colors.
            </p>
          </div>
        );

      case "image":
        return (
          <>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Image URL</span>
                <input
                  type="url"
                  value={(config.url as string) || ""}
                  onChange={(e) => onUpdate({ ...config, url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className={styles.input}
                />
              </label>
            </div>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Alt Text</span>
                <input
                  type="text"
                  value={(config.alt as string) || ""}
                  onChange={(e) => onUpdate({ ...config, alt: e.target.value })}
                  placeholder="Describe the image"
                  className={styles.input}
                />
              </label>
            </div>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Width</span>
                <select
                  value={(config.width as string) || "100%"}
                  onChange={(e) =>
                    onUpdate({ ...config, width: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="100%">Full width</option>
                  <option value="75%">75%</option>
                  <option value="50%">50%</option>
                  <option value="auto">Auto</option>
                </select>
              </label>
            </div>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Border Radius</span>
                <select
                  value={(config.borderRadius as string) || "md"}
                  onChange={(e) =>
                    onUpdate({ ...config, borderRadius: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="none">None</option>
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                  <option value="full">Full (Circle)</option>
                </select>
              </label>
            </div>
          </>
        );

      case "video":
        return (
          <>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Video URL</span>
                <input
                  type="url"
                  value={(config.url as string) || ""}
                  onChange={(e) => onUpdate({ ...config, url: e.target.value })}
                  placeholder="YouTube, Vimeo, or direct URL"
                  className={styles.input}
                />
              </label>
              <p className={styles.hint}>
                Supports YouTube, Vimeo, and direct video URLs
              </p>
            </div>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Aspect Ratio</span>
                <select
                  value={(config.aspectRatio as string) || "16/9"}
                  onChange={(e) =>
                    onUpdate({ ...config, aspectRatio: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="16/9">16:9 (Widescreen)</option>
                  <option value="4/3">4:3 (Standard)</option>
                  <option value="1/1">1:1 (Square)</option>
                  <option value="9/16">9:16 (Vertical)</option>
                </select>
              </label>
            </div>
          </>
        );

      case "columns":
        return (
          <>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Column Ratio</span>
                <select
                  value={(config.ratio as string) || "50-50"}
                  onChange={(e) =>
                    onUpdate({ ...config, ratio: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="50-50">50% / 50%</option>
                  <option value="60-40">60% / 40%</option>
                  <option value="40-60">40% / 60%</option>
                  <option value="70-30">70% / 30%</option>
                  <option value="30-70">30% / 70%</option>
                </select>
              </label>
            </div>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Gap</span>
                <select
                  value={(config.gap as string) || "md"}
                  onChange={(e) => onUpdate({ ...config, gap: e.target.value })}
                  className={styles.select}
                >
                  <option value="none">None</option>
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                  <option value="xl">Extra Large</option>
                </select>
              </label>
            </div>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Vertical Alignment</span>
                <select
                  value={(config.verticalAlign as string) || "top"}
                  onChange={(e) =>
                    onUpdate({ ...config, verticalAlign: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="top">Top</option>
                  <option value="center">Center</option>
                  <option value="bottom">Bottom</option>
                </select>
              </label>
            </div>
            <p className={styles.hint}>
              Drag any widget from the palette into each column. You can nest
              Text, Image, Video, or even more Columns.
            </p>
          </>
        );

      default:
        return (
          <p className={styles.hint}>No settings available for this widget.</p>
        );
    }
  };

  const getWidgetTitle = () => {
    switch (widget.widgetType) {
      case "text":
        return "Text Settings";
      case "image":
        return "Image Settings";
      case "video":
        return "Video Settings";
      case "columns":
        return "Columns Settings";
      default:
        return "Widget Settings";
    }
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3 className={styles.title}>{getWidgetTitle()}</h3>
        <button onClick={onClose} className={styles.closeButton} title="Close">
          <X weight="bold" />
        </button>
      </div>
      <div className={styles.content}>{renderSettings()}</div>
    </div>
  );
};
