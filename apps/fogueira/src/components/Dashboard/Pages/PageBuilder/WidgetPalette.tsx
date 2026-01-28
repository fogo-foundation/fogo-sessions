"use client";
import { Code, Columns, Cursor, Image, Square, TextAa, TextT, Video, Users, Rectangle } from "@phosphor-icons/react";
import { useDraggable } from "@dnd-kit/core";
import styles from "./WidgetPalette.module.scss";

type WidgetType = {
  id: string;
  name: string;
  icon: React.ReactNode;
};

const widgetTypes: WidgetType[] = [
  {
    id: "text",
    name: "Text",
    icon: <TextT weight="regular" />,
  },
  {
    id: "header",
    name: "Header",
    icon: <TextAa weight="regular" />,
  },
  {
    id: "image",
    name: "Image",
    icon: <Image weight="regular" />,
  },
  {
    id: "video",
    name: "Video",
    icon: <Video weight="regular" />,
  },
  {
    id: "button",
    name: "Button",
    icon: <Cursor weight="regular" />,
  },
  {
    id: "embed",
    name: "Embed",
    icon: <Code weight="regular" />,
  },
  {
    id: "html",
    name: "HTML",
    icon: <Code weight="regular" />,
  },
  {
    id: "columns",
    name: "2 Columns",
    icon: <Columns weight="regular" />,
  },
  {
    id: "container",
    name: "Container",
    icon: <Square weight="regular" />,
  },
  {
    id: "memberships",
    name: "Memberships",
    icon: <Users weight="regular" />,
  },
  {
    id: "hero",
    name: "Hero",
    icon: <Rectangle weight="regular" />,
  },
];

const DraggableWidget = ({ widget }: { widget: WidgetType }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette-${widget.id}`,
      data: {
        widgetType: widget.id,
      },
    });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.widget} ${isDragging ? styles.dragging : ""}`}
      {...listeners}
      {...attributes}
    >
      <div className={styles.widgetIcon}>{widget.icon}</div>
      <span className={styles.widgetName}>{widget.name}</span>
    </div>
  );
};

export const WidgetPalette = () => {
  return (
    <div className={styles.palette}>
      <div className={styles.header}>
        <h3 className={styles.title}>Widgets</h3>
        <p className={styles.subtitle}>Drag to add</p>
      </div>
      <div className={styles.widgets}>
        {widgetTypes.map((widget) => (
          <DraggableWidget key={widget.id} widget={widget} />
        ))}
      </div>
    </div>
  );
};

