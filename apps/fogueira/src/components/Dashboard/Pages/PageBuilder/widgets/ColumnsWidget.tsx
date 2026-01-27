"use client";
import { Trash, DotsSixVertical, SquaresFour } from "@phosphor-icons/react";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import styles from "./ColumnsWidget.module.scss";
import { TextWidget } from "./TextWidget";
import { ImageWidget } from "./ImageWidget";
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

export const ColumnsWidget = ({ widgetId, config, onUpdate }: Props) => {
  const leftWidgets = (config.leftWidgets as NestedWidget[]) || [];
  const rightWidgets = (config.rightWidgets as NestedWidget[]) || [];
  const ratio = (config.ratio as string) || "50-50";
  const gap = (config.gap as string) || "md";
  const verticalAlign = (config.verticalAlign as string) || "top";

  const updateNestedWidget = (
    column: "left" | "right",
    nestedId: string,
    nestedConfig: Record<string, unknown>,
  ) => {
    const widgets = column === "left" ? leftWidgets : rightWidgets;
    const updated = widgets.map((w) =>
      w.id === nestedId ? { ...w, config: nestedConfig } : w,
    );
    if (column === "left") {
      onUpdate({ ...config, leftWidgets: updated });
    } else {
      onUpdate({ ...config, rightWidgets: updated });
    }
  };

  const deleteNestedWidget = (column: "left" | "right", nestedId: string) => {
    const widgets = column === "left" ? leftWidgets : rightWidgets;
    const updated = widgets.filter((w) => w.id !== nestedId);
    if (column === "left") {
      onUpdate({ ...config, leftWidgets: updated });
    } else {
      onUpdate({ ...config, rightWidgets: updated });
    }
  };

  const getColumnWidths = () => {
    switch (ratio) {
      case "70-30":
        return { left: "70%", right: "30%" };
      case "30-70":
        return { left: "30%", right: "70%" };
      case "60-40":
        return { left: "60%", right: "40%" };
      case "40-60":
        return { left: "40%", right: "60%" };
      default:
        return { left: "50%", right: "50%" };
    }
  };

  const getGapSize = () => {
    switch (gap) {
      case "none":
        return "0";
      case "sm":
        return "0.5rem";
      case "lg":
        return "2rem";
      case "xl":
        return "3rem";
      default:
        return "1rem";
    }
  };

  const widths = getColumnWidths();

  return (
    <div
      className={styles.widget}
      style={
        {
          "--gap": getGapSize(),
          "--align":
            verticalAlign === "center"
              ? "center"
              : verticalAlign === "bottom"
                ? "flex-end"
                : "flex-start",
        } as React.CSSProperties
      }
      onClick={(e) => e.stopPropagation()}
    >
      <ColumnDropZone
        columnId={`${widgetId}-left`}
        widgets={leftWidgets}
        width={widths.left}
        onUpdateWidget={(id, cfg) => updateNestedWidget("left", id, cfg)}
        onDeleteWidget={(id) => deleteNestedWidget("left", id)}
        parentWidgetId={widgetId}
      />
      <ColumnDropZone
        columnId={`${widgetId}-right`}
        widgets={rightWidgets}
        width={widths.right}
        onUpdateWidget={(id, cfg) => updateNestedWidget("right", id, cfg)}
        onDeleteWidget={(id) => deleteNestedWidget("right", id)}
        parentWidgetId={widgetId}
      />
    </div>
  );
};

type ColumnDropZoneProps = {
  columnId: string;
  widgets: NestedWidget[];
  width: string;
  onUpdateWidget: (id: string, config: Record<string, unknown>) => void;
  onDeleteWidget: (id: string) => void;
  parentWidgetId: string;
};

const ColumnDropZone = ({
  columnId,
  widgets,
  width,
  onUpdateWidget,
  onDeleteWidget,
}: ColumnDropZoneProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
    data: {
      type: "column",
      columnId,
    },
  });

  return (
    <div
      ref={setNodeRef}
      className={`${styles.column} ${isOver ? styles.columnOver : ""}`}
      style={{ width: `calc(${width} - var(--gap) / 2)` }}
    >
      <SortableContext
        items={widgets.map((w) => w.id)}
        strategy={verticalListSortingStrategy}
      >
        {widgets.map((widget) => (
          <SortableNestedWidget
            key={widget.id}
            widget={widget}
            onUpdate={(cfg) => onUpdateWidget(widget.id, cfg)}
            onDelete={() => onDeleteWidget(widget.id)}
          />
        ))}
      </SortableContext>
      {widgets.length === 0 && (
        <div className={styles.emptyColumn}>
          <SquaresFour size={20} weight="light" />
          <span>Drop widgets here</span>
        </div>
      )}
    </div>
  );
};

type SortableNestedWidgetProps = {
  widget: NestedWidget;
  onUpdate: (config: Record<string, unknown>) => void;
  onDelete: () => void;
};

const SortableNestedWidget = ({
  widget,
  onUpdate,
  onDelete,
}: SortableNestedWidgetProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: widget.id,
    data: {
      type: "nested-widget",
      widget,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const renderWidget = () => {
    switch (widget.widgetType) {
      case "text":
        return <TextWidget config={widget.config} onUpdate={onUpdate} />;
      case "image":
        return <ImageWidget config={widget.config} onUpdate={onUpdate} />;
      case "video":
        return <VideoWidget config={widget.config} onUpdate={onUpdate} />;
      case "columns":
        return (
          <ColumnsWidget
            widgetId={widget.id}
            config={widget.config}
            onUpdate={onUpdate}
          />
        );
      default:
        return <div className={styles.unknown}>Unknown: {widget.widgetType}</div>;
    }
  };

  return (
    <div ref={setNodeRef} style={style} className={styles.nestedWidget}>
      <div className={styles.nestedControls}>
        <button
          className={styles.dragHandle}
          {...attributes}
          {...listeners}
          title="Drag"
        >
          <DotsSixVertical weight="bold" size={14} />
        </button>
        <button
          className={styles.deleteButton}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete"
        >
          <Trash weight="bold" size={14} />
        </button>
      </div>
      <div className={styles.nestedContent}>{renderWidget()}</div>
    </div>
  );
};
