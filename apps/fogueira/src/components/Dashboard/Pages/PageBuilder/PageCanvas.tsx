"use client";
import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { SquaresFour } from "@phosphor-icons/react";
import { useCallback } from "react";
import styles from "./PageCanvas.module.scss";
import { WidgetRenderer } from "./WidgetRenderer";

type Widget = {
  id: string;
  widgetType: string;
  config: Record<string, unknown>;
  orderIndex: number;
  gatingRuleId: string | null;
};

type Props = {
  widgets: Widget[];
  selectedWidgetId: string | null;
  onWidgetsChange: (widgets: Widget[]) => void;
  onWidgetSelect: (widgetId: string | null) => void;
};

export const PageCanvas = ({
  widgets,
  selectedWidgetId,
  onWidgetsChange,
  onWidgetSelect,
}: Props) => {
  const handleWidgetUpdate = useCallback(
    (id: string, config: Record<string, unknown>) => {
      const updated = widgets.map((widget) =>
        widget.id === id ? { ...widget, config } : widget,
      );
      onWidgetsChange(updated);
    },
    [widgets, onWidgetsChange],
  );

  const handleWidgetDelete = useCallback(
    (id: string) => {
      const updated = widgets
        .filter((widget) => widget.id !== id)
        .map((widget, index) => ({
          ...widget,
          orderIndex: index,
        }));
      onWidgetsChange(updated);
      if (selectedWidgetId === id) {
        // Clear selection if deleted widget was selected
        onWidgetSelect(null);
      }
    },
    [widgets, onWidgetsChange, selectedWidgetId, onWidgetSelect],
  );

  const handleCanvasClick = (e: React.MouseEvent) => {
    // Only deselect if clicking directly on canvas (not on a widget)
    if (e.target === e.currentTarget) {
      onWidgetSelect(null);
    }
  };

  return (
    <CanvasDropZone onClick={handleCanvasClick}>
      {widgets.length === 0 ? (
        <div className={styles.empty}>
          <SquaresFour size={48} weight="light" className={styles.emptyIcon} />
          <p className={styles.emptyText}>
            Drag widgets from the sidebar to start building
          </p>
        </div>
      ) : (
        <SortableContext
          items={widgets.map((w) => w.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className={styles.widgets}>
            {widgets.map((widget) => (
              <WidgetRenderer
                key={widget.id}
                widget={widget}
                isSelected={selectedWidgetId === widget.id}
                onSelect={() => onWidgetSelect(widget.id)}
                onUpdate={handleWidgetUpdate}
                onDelete={handleWidgetDelete}
              />
            ))}
          </div>
        </SortableContext>
      )}
    </CanvasDropZone>
  );
};

type CanvasDropZoneProps = {
  children: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
};

const CanvasDropZone = ({ children, onClick }: CanvasDropZoneProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas",
  });

  return (
    <div className={styles.canvas} onClick={onClick}>
      <div
        ref={setNodeRef}
        className={`${styles.dropZone} ${isOver ? styles.dropZoneActive : ""}`}
      >
        {children}
      </div>
    </div>
  );
};
