"use client";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { SessionStateType, useSession } from "@fogo/sessions-sdk-react";
import { ArrowSquareOut } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { PageCanvas } from "./PageCanvas";
import { SettingsPanel } from "./SettingsPanel";
import { WidgetPalette } from "./WidgetPalette";
import styles from "./index.module.scss";

type Page = {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  creator: {
    username: string;
  };
};

type Widget = {
  id: string;
  widgetType: string;
  config: Record<string, unknown>;
  orderIndex: number;
  gatingRuleId: string | null;
};

type Revision = {
  id: string;
  status: string;
  widgets: Widget[];
};

export const PageBuilderPage = ({ pageId }: { pageId: string }) => {
  const session = useSession();
  const [page, setPage] = useState<Page | null>(null);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isPublished, setIsPublished] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isDraggingFromPalette, setIsDraggingFromPalette] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
  );

  useEffect(() => {
    if (session.type === SessionStateType.Established) {
      fetchPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, pageId]);

  const fetchPage = async () => {
    if (session.type !== SessionStateType.Established) return;

    try {
      const token = await session.createLogInToken();
      const response = await fetch(`/api/creator/pages/${pageId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPage(data.page);
        setIsPublished(
          data.page.revisions.some((r: Revision) => r.status === "published"),
        );
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  };

  const fetchRevision = async () => {
    if (session.type !== SessionStateType.Established) return;

    try {
      const token = await session.createLogInToken();
      const response = await fetch(`/api/creator/pages/${pageId}/revisions`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setRevision(data.revision);
      }
    } catch {
      // Silently fail
    }
  };

  useEffect(() => {
    if (page) {
      fetchRevision();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const handleSave = async (widgets: Widget[], shouldPublish = false) => {
    if (session.type !== SessionStateType.Established) return;
    setSaving(true);

    try {
      const token = await session.createLogInToken();
      const response = await fetch(`/api/creator/pages/${pageId}/revisions`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ widgets }),
      });

      if (response.ok) {
        const data = await response.json();
        setRevision(data.revision);
        setHasUnsavedChanges(false);

        // If page is published or we want to publish, re-publish to make changes live
        if (isPublished || shouldPublish) {
          await doPublish(token);
        }
      }
    } catch {
      // Silently fail
    } finally {
      setSaving(false);
    }
  };

  const doPublish = async (token: string) => {
    const response = await fetch(`/api/creator/pages/${pageId}/publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      setIsPublished(true);
    }
  };

  const handleManualSave = () => {
    if (revision) {
      handleSave(revision.widgets);
    }
  };

  const handleSaveAndPublish = async () => {
    if (!revision) return;
    await handleSave(revision.widgets, true);
  };

  const handlePublish = async () => {
    if (session.type !== SessionStateType.Established) return;

    try {
      const token = await session.createLogInToken();
      const response = await fetch(`/api/creator/pages/${pageId}/publish`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setIsPublished(true);
        fetchPage();
      }
    } catch {
      // Silently fail
    }
  };

  const handleUnpublish = async () => {
    if (session.type !== SessionStateType.Established) return;

    try {
      const token = await session.createLogInToken();
      const response = await fetch(`/api/creator/pages/${pageId}/publish`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setIsPublished(false);
        fetchPage();
      }
    } catch {
      // Silently fail
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);

    const isFromPalette = active.id.toString().startsWith("palette-");
    if (isFromPalette) {
      setIsDraggingFromPalette(true);
    }
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setIsDraggingFromPalette(false);

      if (!over || !revision) return;

      const widgetType = (active.data.current as { widgetType?: string })
        ?.widgetType;
      const isFromPalette = active.id.toString().startsWith("palette-");
      const overData = over.data.current as { type?: string; columnId?: string } | undefined;

      // Check if dropping into a column
      if (overData?.type === "column" && overData.columnId) {
        const columnId = overData.columnId;
        // columnId format: "{parentWidgetId}-{left|right}"
        const [parentWidgetId, side] = columnId.split(/-(?=[^-]+$)/);
        const column = side as "left" | "right";

        if (isFromPalette && widgetType) {
          // Add new widget to column
          const newNestedWidget = {
            id: uuidv4(),
            widgetType,
            config: getDefaultConfig(widgetType),
          };

          const updated = revision.widgets.map((widget) => {
            if (widget.id === parentWidgetId && widget.widgetType === "columns") {
              const leftWidgets = (widget.config.leftWidgets as Array<{ id: string; widgetType: string; config: Record<string, unknown> }>) || [];
              const rightWidgets = (widget.config.rightWidgets as Array<{ id: string; widgetType: string; config: Record<string, unknown> }>) || [];
              return {
                ...widget,
                config: {
                  ...widget.config,
                  leftWidgets: column === "left" ? [...leftWidgets, newNestedWidget] : leftWidgets,
                  rightWidgets: column === "right" ? [...rightWidgets, newNestedWidget] : rightWidgets,
                },
              };
            }
            return widget;
          });

          setRevision((prev) => (prev ? { ...prev, widgets: updated } : null));
          setHasUnsavedChanges(true);
          return;
        }
      }

      // Add to main canvas from palette
      if (widgetType && isFromPalette) {
        const newWidget: Widget = {
          id: uuidv4(),
          widgetType,
          config: getDefaultConfig(widgetType),
          orderIndex: revision.widgets.length,
          gatingRuleId: null,
        };
        const updated = [...revision.widgets, newWidget];
        setRevision((prev) => (prev ? { ...prev, widgets: updated } : null));
        setHasUnsavedChanges(true);
        return;
      }

      // Reorder on main canvas
      if (active.id !== over.id && !isFromPalette) {
        const oldIndex = revision.widgets.findIndex((w) => w.id === active.id);
        const newIndex = revision.widgets.findIndex((w) => w.id === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          const updated = arrayMove(revision.widgets, oldIndex, newIndex).map(
            (widget, index) => ({
              ...widget,
              orderIndex: index,
            }),
          );
          setRevision((prev) => (prev ? { ...prev, widgets: updated } : null));
          setHasUnsavedChanges(true);
        }
      }
    },
    [revision],
  );

  const handleWidgetsChange = useCallback((widgets: Widget[]) => {
    setRevision((prev) => (prev ? { ...prev, widgets } : null));
    setHasUnsavedChanges(true);
  }, []);

  const handleWidgetSelect = useCallback((widgetId: string | null) => {
    setSelectedWidgetId(widgetId);
  }, []);

  const handleWidgetConfigUpdate = useCallback(
    (config: Record<string, unknown>) => {
      if (!selectedWidgetId || !revision) return;
      const updated = revision.widgets.map((widget) =>
        widget.id === selectedWidgetId ? { ...widget, config } : widget,
      );
      setRevision((prev) => (prev ? { ...prev, widgets: updated } : null));
      setHasUnsavedChanges(true);
    },
    [selectedWidgetId, revision],
  );

  const selectedWidget = revision?.widgets.find(
    (w) => w.id === selectedWidgetId,
  ) ?? null;

  if (loading) {
    return (
      <div className={styles.page}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!page || !revision) {
    return (
      <div className={styles.page}>
        <p>Page not found</p>
      </div>
    );
  }

  const pageUrl = page.isHome
    ? `/${page.creator.username}`
    : `/${page.creator.username}/${page.slug}`;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>{page.title}</h1>
          <p className={styles.subtitle}>/{page.slug}</p>
        </div>
        <div className={styles.actions}>
          {saving && <span className={styles.saving}>Saving...</span>}
          {hasUnsavedChanges && !saving && (
            <span className={styles.unsaved}>Unsaved changes</span>
          )}
          <button
            onClick={handleManualSave}
            className={styles.saveButton}
            disabled={saving || !hasUnsavedChanges}
          >
            Save
          </button>
          <Link
            href={pageUrl}
            target="_blank"
            className={styles.viewButton}
          >
            <ArrowSquareOut weight="bold" />
            View Page
          </Link>
          {isPublished ? (
            <button
              onClick={handleUnpublish}
              className={styles.unpublishButton}
            >
              Unpublish
            </button>
          ) : (
            <button
              onClick={hasUnsavedChanges ? handleSaveAndPublish : handlePublish}
              className={styles.publishButton}
            >
              {hasUnsavedChanges ? "Save & Publish" : "Publish"}
            </button>
          )}
        </div>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className={styles.builder}>
          <WidgetPalette />
          <PageCanvas
            widgets={revision.widgets}
            selectedWidgetId={selectedWidgetId}
            onWidgetsChange={handleWidgetsChange}
            onWidgetSelect={handleWidgetSelect}
          />
          {selectedWidget && (
            <SettingsPanel
              widget={selectedWidget}
              onUpdate={handleWidgetConfigUpdate}
              onClose={() => setSelectedWidgetId(null)}
            />
          )}
        </div>
        <DragOverlay>
          {activeId && isDraggingFromPalette ? (
            <div className={styles.dragPreview}>Adding widget...</div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};

function getDefaultConfig(widgetType: string): Record<string, unknown> {
  switch (widgetType) {
    case "text":
      return { content: "", alignment: "left" };
    case "image":
      return { url: "", alt: "", width: "100%" };
    case "video":
      return { url: "", width: "100%" };
    case "columns":
      return { leftWidgets: [], rightWidgets: [], ratio: "50-50", gap: "md", verticalAlign: "top" };
    default:
      return {};
  }
}

