"use client";
import { X } from "@phosphor-icons/react";
import { ImageSettings } from "./ImageSettings";
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

      case "header":
        return (
          <div className={styles.settingsGroup}>
            <label className={styles.label}>
              <span>Header Level</span>
              <select
                value={(config.level as number) || 1}
                onChange={(e) =>
                  onUpdate({ ...config, level: Number(e.target.value) })
                }
                className={styles.select}
              >
                <option value={1}>H1 - Largest</option>
                <option value={2}>H2</option>
                <option value={3}>H3</option>
                <option value={4}>H4</option>
                <option value={5}>H5</option>
                <option value={6}>H6 - Smallest</option>
              </select>
            </label>
            <p className={styles.hint}>
              Use the toolbar to format text. Change header level using the
              H1-H6 buttons.
            </p>
          </div>
        );

      case "image":
        return <ImageSettings config={config} onUpdate={onUpdate} />;

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

      case "button":
        return (
          <>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Button Text</span>
                <input
                  type="text"
                  value={(config.text as string) || ""}
                  onChange={(e) =>
                    onUpdate({ ...config, text: e.target.value })
                  }
                  placeholder="Click me"
                  className={styles.input}
                />
              </label>
            </div>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Link URL</span>
                <input
                  type="url"
                  value={(config.url as string) || ""}
                  onChange={(e) => onUpdate({ ...config, url: e.target.value })}
                  placeholder="https://example.com"
                  className={styles.input}
                />
              </label>
            </div>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Style</span>
                <select
                  value={(config.variant as string) || "primary"}
                  onChange={(e) =>
                    onUpdate({ ...config, variant: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="primary">Primary</option>
                  <option value="secondary">Secondary</option>
                  <option value="outline">Outline</option>
                  <option value="ghost">Ghost</option>
                </select>
              </label>
            </div>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Size</span>
                <select
                  value={(config.size as string) || "md"}
                  onChange={(e) =>
                    onUpdate({ ...config, size: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="sm">Small</option>
                  <option value="md">Medium</option>
                  <option value="lg">Large</option>
                </select>
              </label>
            </div>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Alignment</span>
                <select
                  value={(config.alignment as string) || "left"}
                  onChange={(e) =>
                    onUpdate({ ...config, alignment: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
            </div>
          </>
        );

      case "embed":
        return (
          <>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Embed URL</span>
                <input
                  type="url"
                  value={(config.url as string) || ""}
                  onChange={(e) => onUpdate({ ...config, url: e.target.value })}
                  placeholder="YouTube, Vimeo, Spotify, Loom..."
                  className={styles.input}
                />
              </label>
              <p className={styles.hint}>
                Supports YouTube, Vimeo, Spotify, Loom, and SoundCloud
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

      case "html":
        return (
          <>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Custom HTML</span>
                <textarea
                  value={(config.html as string) || ""}
                  onChange={(e) =>
                    onUpdate({ ...config, html: e.target.value })
                  }
                  placeholder="<div>Your custom HTML here...</div>"
                  className={styles.textarea}
                  rows={8}
                />
              </label>
              <p className={styles.hint}>
                Add custom HTML code. Be careful with scripts and external
                resources.
              </p>
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

      case "container":
        return (
          <>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Max Width (px)</span>
                <input
                  type="number"
                  value={(config.maxWidth as string) || "800"}
                  onChange={(e) =>
                    onUpdate({ ...config, maxWidth: e.target.value })
                  }
                  placeholder="800"
                  className={styles.input}
                  min={200}
                  max={2000}
                />
              </label>
            </div>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Alignment</span>
                <select
                  value={(config.alignment as string) || "center"}
                  onChange={(e) =>
                    onUpdate({ ...config, alignment: e.target.value })
                  }
                  className={styles.select}
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </label>
            </div>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Background Color</span>
                <div className={styles.colorRow}>
                  <input
                    type="color"
                    value={(config.bgColor as string) || "#1a1a2e"}
                    onChange={(e) =>
                      onUpdate({ ...config, bgColor: e.target.value })
                    }
                    className={styles.colorPicker}
                  />
                  <input
                    type="text"
                    value={(config.bgColor as string) || ""}
                    onChange={(e) =>
                      onUpdate({ ...config, bgColor: e.target.value })
                    }
                    placeholder="transparent"
                    className={styles.input}
                  />
                </div>
              </label>
            </div>
            <div className={styles.settingsGroup}>
              <label className={styles.label}>
                <span>Padding</span>
                <select
                  value={(config.padding as string) || "md"}
                  onChange={(e) =>
                    onUpdate({ ...config, padding: e.target.value })
                  }
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
            <p className={styles.hint}>
              Drag any widget from the palette into this container. Useful for
              creating contained sections within a full-width page.
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
      case "header":
        return "Header Settings";
      case "image":
        return "Image Settings";
      case "video":
        return "Video Settings";
      case "button":
        return "Button Settings";
      case "embed":
        return "Embed Settings";
      case "html":
        return "HTML Settings";
      case "columns":
        return "Columns Settings";
      case "container":
        return "Container Settings";
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
