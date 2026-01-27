"use client";
import styles from "./WidgetRenderer.module.scss";

type NestedWidget = {
  id: string;
  widgetType: string;
  config: Record<string, unknown>;
};

type Widget = {
  id: string;
  widgetType: string;
  config: Record<string, unknown>;
  orderIndex: number;
};

type Props = {
  widget: Widget;
};

export const WidgetRenderer = ({ widget }: Props) => {
  switch (widget.widgetType) {
    case "text":
      return <TextWidget config={widget.config} />;
    case "image":
      return <ImageWidget config={widget.config} />;
    case "video":
      return <VideoWidget config={widget.config} />;
    case "columns":
      return <ColumnsWidget config={widget.config} />;
    default:
      return null;
  }
};

const TextWidget = ({ config }: { config: Record<string, unknown> }) => {
  const content = (config.content as string) || "";

  if (!content) {
    return null;
  }

  return (
    <div
      className={styles.textWidget}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: User-generated rich text content
      dangerouslySetInnerHTML={{ __html: content }}
    />
  );
};

const ImageWidget = ({ config }: { config: Record<string, unknown> }) => {
  const url = (config.url as string) || "";
  const alt = (config.alt as string) || "";
  const borderRadius = (config.borderRadius as string) || "md";

  if (!url) {
    return null;
  }

  const getBorderRadius = () => {
    switch (borderRadius) {
      case "none":
        return "0";
      case "sm":
        return "4px";
      case "lg":
        return "16px";
      case "full":
        return "9999px";
      default:
        return "8px";
    }
  };

  return (
    <div className={styles.imageWidget}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        className={styles.image}
        style={{ borderRadius: getBorderRadius() }}
      />
    </div>
  );
};

const VideoWidget = ({ config }: { config: Record<string, unknown> }) => {
  const url = (config.url as string) || "";
  const aspectRatio = (config.aspectRatio as string) || "16/9";

  if (!url) {
    return null;
  }

  // Support YouTube, Vimeo, and direct video URLs
  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
  const isVimeo = url.includes("vimeo.com");

  if (isYouTube || isVimeo) {
    let embedUrl = url;

    // Convert YouTube URLs to embed format
    if (isYouTube) {
      const videoId = url.includes("youtu.be")
        ? url.split("/").pop()
        : url.split("v=")[1]?.split("&")[0];
      if (videoId) {
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
    }

    // Convert Vimeo URLs to embed format
    if (isVimeo && !url.includes("/video/")) {
      const videoId = url.split("/").pop();
      if (videoId) {
        embedUrl = `https://player.vimeo.com/video/${videoId}`;
      }
    }

    return (
      <div className={styles.videoWidget} style={{ aspectRatio }}>
        <iframe
          src={embedUrl}
          className={styles.iframe}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          title="Embedded video"
        />
      </div>
    );
  }

  return (
    <div className={styles.videoWidget} style={{ aspectRatio }}>
      {/* biome-ignore lint: Video element doesn't need captions for user content */}
      <video src={url} controls className={styles.video}>
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

const ColumnsWidget = ({ config }: { config: Record<string, unknown> }) => {
  const leftWidgets = (config.leftWidgets as NestedWidget[]) || [];
  const rightWidgets = (config.rightWidgets as NestedWidget[]) || [];
  const gap = (config.gap as string) || "md";
  const ratio = (config.ratio as string) || "50-50";
  const verticalAlign = (config.verticalAlign as string) || "top";

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

  const getAlign = () => {
    switch (verticalAlign) {
      case "center":
        return "center";
      case "bottom":
        return "flex-end";
      default:
        return "flex-start";
    }
  };

  const renderNestedWidget = (widget: NestedWidget): React.ReactNode => {
    switch (widget.widgetType) {
      case "text": {
        const content = (widget.config.content as string) || "";
        if (!content) return null;
        return (
          <div
            key={widget.id}
            className={styles.nestedText}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: User-generated rich text content
            dangerouslySetInnerHTML={{ __html: content }}
          />
        );
      }
      case "image": {
        const url = (widget.config.url as string) || "";
        const alt = (widget.config.alt as string) || "";
        if (!url) return null;
        return (
          <div key={widget.id} className={styles.nestedImage}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={alt} className={styles.image} />
          </div>
        );
      }
      case "video": {
        const url = (widget.config.url as string) || "";
        if (!url) return null;
        const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
        const isVimeo = url.includes("vimeo.com");
        let embedUrl = url;
        if (isYouTube) {
          const videoId = url.includes("youtu.be")
            ? url.split("/").pop()
            : url.split("v=")[1]?.split("&")[0];
          if (videoId) embedUrl = `https://www.youtube.com/embed/${videoId}`;
        }
        if (isVimeo && !url.includes("/video/")) {
          const videoId = url.split("/").pop();
          if (videoId) embedUrl = `https://player.vimeo.com/video/${videoId}`;
        }
        const isEmbed = embedUrl.includes("youtube.com/embed") || embedUrl.includes("player.vimeo.com");
        return (
          <div key={widget.id} className={styles.nestedVideo}>
            {isEmbed ? (
              <iframe
                src={embedUrl}
                className={styles.iframe}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="Video"
              />
            ) : (
              // biome-ignore lint: Video element doesn't need captions for user content
              <video src={url} controls className={styles.video}>
                Your browser does not support the video tag.
              </video>
            )}
          </div>
        );
      }
      case "columns": {
        // Recursive nested columns
        return (
          <div key={widget.id} className={styles.nestedColumns}>
            <ColumnsWidget config={widget.config} />
          </div>
        );
      }
      default:
        return null;
    }
  };

  // Don't render if both columns are empty
  if (leftWidgets.length === 0 && rightWidgets.length === 0) {
    return null;
  }

  const widths = getColumnWidths();
  const gapSize = getGapSize();

  return (
    <div
      className={styles.columnsWidget}
      style={{
        gap: gapSize,
        alignItems: getAlign(),
      }}
    >
      <div
        className={styles.column}
        style={{ width: `calc(${widths.left} - ${gapSize} / 2)` }}
      >
        {leftWidgets.map(renderNestedWidget)}
      </div>
      <div
        className={styles.column}
        style={{ width: `calc(${widths.right} - ${gapSize} / 2)` }}
      >
        {rightWidgets.map(renderNestedWidget)}
      </div>
    </div>
  );
};
