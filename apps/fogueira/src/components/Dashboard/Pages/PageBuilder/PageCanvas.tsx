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

type PageSettings = {
  bgImage: string | null;
  bgColor: string | null;
  overlayColor: string | null;
  fullWidth: boolean;
};

type Props = {
  widgets: Widget[];
  selectedWidgetId: string | null;
  selectedNestedWidget: {
    parentId: string;
    nestedId: string;
    column: "left" | "right";
  } | null;
  onWidgetsChange: (widgets: Widget[]) => void;
  onWidgetSelect: (widgetId: string | null) => void;
  onNestedWidgetSelect: (
    parentId: string,
    nestedId: string,
    column: "left" | "right",
  ) => void;
  pageSettings: PageSettings;
  creatorUsername: string;
};

export const PageCanvas = ({
  widgets,
  selectedWidgetId,
  selectedNestedWidget,
  onWidgetsChange,
  onWidgetSelect,
  creatorUsername,
  onNestedWidgetSelect,
  pageSettings,
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
    <CanvasDropZone onClick={handleCanvasClick} pageSettings={pageSettings}>
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
                selectedNestedWidget={selectedNestedWidget}
                onSelect={() => {
                  onWidgetSelect(widget.id);
                }}
                onNestedWidgetSelect={onNestedWidgetSelect}
                onUpdate={handleWidgetUpdate}
                onDelete={handleWidgetDelete}
                creatorUsername={creatorUsername}
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
  pageSettings: PageSettings;
};

const CanvasDropZone = ({
  children,
  onClick,
  pageSettings,
}: CanvasDropZoneProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas",
  });

  // Build canvas styles from page settings
  const canvasStyle: React.CSSProperties = {};
  if (pageSettings.bgColor) {
    canvasStyle.backgroundColor = pageSettings.bgColor;
  }
  if (pageSettings.bgImage) {
    canvasStyle.backgroundImage = `url(${pageSettings.bgImage})`;
    canvasStyle.backgroundSize = "cover";
    canvasStyle.backgroundPosition = "center";
    canvasStyle.backgroundAttachment = "fixed";
  }

  return (
    <div className={styles.canvas} onClick={onClick} style={canvasStyle}>
      {/* Background overlay */}
      {pageSettings.overlayColor && (
        <div
          className={styles.overlay}
          style={{ backgroundColor: pageSettings.overlayColor }}
        />
      )}
      <div
        ref={setNodeRef}
        className={`${styles.dropZone} ${isOver ? styles.dropZoneActive : ""} ${pageSettings.fullWidth ? styles.fullWidth : ""}`}
      >
        {children}
      </div>
    </div>
  );
};
