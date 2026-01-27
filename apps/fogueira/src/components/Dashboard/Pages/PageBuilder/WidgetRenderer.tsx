"use client";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { DotsSixVertical, Trash } from "@phosphor-icons/react";
import { useState } from "react";
import { ButtonWidget } from "./widgets/ButtonWidget";
import { ColumnsWidget } from "./widgets/ColumnsWidget";
import { ContainerWidget } from "./widgets/ContainerWidget";
import { EmbedWidget } from "./widgets/EmbedWidget";
import { HeaderWidget } from "./widgets/HeaderWidget";
import { HtmlWidget } from "./widgets/HtmlWidget";
import { ImageWidget } from "./widgets/ImageWidget";
import { TextWidget } from "./widgets/TextWidget";
import { VideoWidget } from "./widgets/VideoWidget";
import styles from "./WidgetRenderer.module.scss";

type Widget = {
  id: string;
  widgetType: string;
  config: Record<string, unknown>;
  orderIndex: number;
  gatingRuleId: string | null;
};

type Props = {
  widget: Widget;
  isSelected: boolean;
  onSelect: () => void;
  onUpdate: (id: string, config: Record<string, unknown>) => void;
  onDelete: (id: string) => void;
};

export const WidgetRenderer = ({
  widget,
  isSelected,
  onSelect,
  onUpdate,
  onDelete,
}: Props) => {
  // Widget renderer component
  const [isHovered, setIsHovered] = useState(false);

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

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect();
  };

  const renderWidget = () => {
    switch (widget.widgetType) {
      case "text":
        return (
          <TextWidget
            config={widget.config}
            onUpdate={(config) => onUpdate(widget.id, config)}
          />
        );
      case "header":
        return (
          <HeaderWidget
            config={widget.config}
            onUpdate={(config) => onUpdate(widget.id, config)}
          />
        );
      case "image":
        return (
          <ImageWidget
            config={widget.config}
            onUpdate={(config) => onUpdate(widget.id, config)}
          />
        );
      case "video":
        return (
          <VideoWidget
            config={widget.config}
            onUpdate={(config) => onUpdate(widget.id, config)}
          />
        );
      case "button":
        return (
          <ButtonWidget
            config={widget.config}
            onUpdate={(config) => onUpdate(widget.id, config)}
          />
        );
      case "embed":
        return (
          <EmbedWidget
            config={widget.config}
            onUpdate={(config) => onUpdate(widget.id, config)}
          />
        );
      case "html":
        return (
          <HtmlWidget
            config={widget.config}
            onUpdate={(config) => onUpdate(widget.id, config)}
          />
        );
      case "columns":
        return (
          <ColumnsWidget
            widgetId={widget.id}
            config={widget.config}
            onUpdate={(config) => onUpdate(widget.id, config)}
          />
        );
      case "container":
        return (
          <ContainerWidget
            widgetId={widget.id}
            config={widget.config}
            onUpdate={(config) => onUpdate(widget.id, config)}
          />
        );
      default:
        return (
          <div className={styles.placeholder}>
            Unknown widget type: {widget.widgetType}
          </div>
        );
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.widget} ${isDragging ? styles.dragging : ""} ${isSelected ? styles.selected : ""}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleClick}
      {...attributes}
      {...listeners}
    >
      <div
        className={`${styles.controls} ${isHovered || isSelected ? styles.visible : ""}`}
      >
        <div className={styles.dragHandle} title="Drag to reorder">
          <DotsSixVertical weight="bold" />
        </div>
        <button
          className={styles.deleteButton}
          onClick={(e) => {
            e.stopPropagation();
            onDelete(widget.id);
          }}
          title="Delete"
        >
          <Trash weight="bold" />
        </button>
      </div>

      <div className={styles.content}>{renderWidget()}</div>
    </div>
  );
};
