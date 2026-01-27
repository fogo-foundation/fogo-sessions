"use client";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVertical, Square, Trash } from "@phosphor-icons/react";
import { ButtonWidget } from "./ButtonWidget";
import styles from "./ContainerWidget.module.scss";
import { EmbedWidget } from "./EmbedWidget";
import { HeaderWidget } from "./HeaderWidget";
import { HtmlWidget } from "./HtmlWidget";
import { ImageWidget } from "./ImageWidget";
import { TextWidget } from "./TextWidget";
import { VideoWidget } from "./VideoWidget";

export type NestedWidget = {
  id: string;
  widgetType: string;
  config: Record<string, unknown>;
};

type Props = {
  widgetId: string;
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
};

export const ContainerWidget = ({ widgetId, config, onUpdate }: Props) => {
  const children = (config.children as NestedWidget[]) || [];
  const maxWidth = (config.maxWidth as string) || "800";
  const alignment = (config.alignment as string) || "center";
  const bgColor = (config.bgColor as string) || "transparent";
  const paddingSize = (config.padding as string) || "md";

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: `container-${widgetId}`,
    data: { type: "container", parentId: widgetId },
  });

  const updateNestedWidget = (
    nestedId: string,
    nestedConfig: Record<string, unknown>,
  ) => {
    const updated = children.map((w) =>
      w.id === nestedId ? { ...w, config: nestedConfig } : w,
    );
    onUpdate({ ...config, children: updated });
  };

  const deleteNestedWidget = (nestedId: string) => {
    const updated = children.filter((w) => w.id !== nestedId);
    onUpdate({ ...config, children: updated });
  };

  const renderNestedWidget = (widget: NestedWidget) => {
    const commonProps = {
      config: widget.config,
      onUpdate: (c: Record<string, unknown>) =>
        updateNestedWidget(widget.id, c),
    };

    switch (widget.widgetType) {
      case "text":
        return <TextWidget {...commonProps} />;
      case "header":
        return <HeaderWidget {...commonProps} />;
      case "image":
        return <ImageWidget {...commonProps} />;
      case "video":
        return <VideoWidget {...commonProps} />;
      case "button":
        return <ButtonWidget {...commonProps} />;
      case "embed":
        return <EmbedWidget {...commonProps} />;
      case "html":
        return <HtmlWidget {...commonProps} />;
      case "columns":
        // Nested columns not supported for simplicity
        return (
          <div className={styles.unsupported}>Nested columns not supported</div>
        );
      case "container":
        // Nested containers not supported for simplicity
        return (
          <div className={styles.unsupported}>
            Nested containers not supported
          </div>
        );
      default:
        return (
          <div className={styles.unknown}>Unknown: {widget.widgetType}</div>
        );
    }
  };

  const getPaddingValue = () => {
    switch (paddingSize) {
      case "none":
        return "0";
      case "sm":
        return "12px";
      case "md":
        return "24px";
      case "lg":
        return "36px";
      case "xl":
        return "48px";
      default:
        return "24px";
    }
  };

  const getMargin = () => {
    switch (alignment) {
      case "left":
        return "0";
      case "right":
        return "0 0 0 auto";
      case "center":
      default:
        return "0 auto";
    }
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: maxWidth + "px",
    padding: getPaddingValue(),
    backgroundColor: bgColor === "transparent" ? "transparent" : bgColor,
    margin: getMargin(),
  };

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <Square weight="regular" size={16} />
        <span className={styles.label}>Container</span>
        <span className={styles.maxWidth}>(max-width: {maxWidth}px)</span>
      </div>

      <div
        ref={setDroppableRef}
        className={`${styles.content} ${isOver ? styles.dragOver : ""}`}
        style={containerStyle}
      >
        {children.length === 0 ? (
          <div className={styles.placeholder}>Drop widgets here</div>
        ) : (
          <SortableContext
            items={children.map((w) => w.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className={styles.children}>
              {children.map((widget) => (
                <NestedWidgetRenderer
                  key={widget.id}
                  widget={widget}
                  onUpdate={(c) => updateNestedWidget(widget.id, c)}
                  onDelete={() => deleteNestedWidget(widget.id)}
                  renderContent={() => renderNestedWidget(widget)}
                />
              ))}
            </div>
          </SortableContext>
        )}
      </div>
    </div>
  );
};

// Nested widget renderer with drag handle and delete button
type NestedWidgetRendererProps = {
  widget: NestedWidget;
  onUpdate: (config: Record<string, unknown>) => void;
  onDelete: () => void;
  renderContent: () => React.ReactNode;
};

const NestedWidgetRenderer = ({
  widget,
  onDelete,
  renderContent,
}: NestedWidgetRendererProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: widget.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.nestedWidget}>
      <div className={styles.nestedControls}>
        <button
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          title="Drag to reorder"
        >
          <DotsSixVertical weight="bold" size={14} />
        </button>
        <button
          className={styles.deleteButton}
          onClick={onDelete}
          title="Delete"
        >
          <Trash weight="bold" size={14} />
        </button>
      </div>
      <div className={styles.nestedContent}>{renderContent()}</div>
    </div>
  );
};
