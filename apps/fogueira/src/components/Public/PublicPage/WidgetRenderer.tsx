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
    case "header":
      return <HeaderWidget config={widget.config} />;
    case "image":
      return <ImageWidget config={widget.config} />;
    case "video":
      return <VideoWidget config={widget.config} />;
    case "button":
      return <ButtonWidget config={widget.config} />;
    case "embed":
      return <EmbedWidget config={widget.config} />;
    case "html":
      return <HtmlWidget config={widget.config} />;
    case "columns":
      return <ColumnsWidget config={widget.config} />;
    case "container":
      return <ContainerWidget config={widget.config} />;
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

const HeaderWidget = ({ config }: { config: Record<string, unknown> }) => {
  const content = (config.content as string) || "";

  if (!content) {
    return null;
  }

  return (
    <div
      className={styles.headerWidget}
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

const ButtonWidget = ({ config }: { config: Record<string, unknown> }) => {
  const text = (config.text as string) || "Click me";
  const url = (config.url as string) || "";
  const variant = (config.variant as string) || "primary";
  const size = (config.size as string) || "md";
  const alignment = (config.alignment as string) || "left";

  if (!text) return null;

  return (
    <div
      className={styles.buttonWidget}
      style={{ textAlign: alignment as "left" | "center" | "right" }}
    >
      <a
        href={url || "#"}
        className={`${styles.button} ${styles[`button--${variant}`]} ${styles[`button--${size}`]}`}
        target={url.startsWith("http") ? "_blank" : undefined}
        rel={url.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {text}
      </a>
    </div>
  );
};

const EmbedWidget = ({ config }: { config: Record<string, unknown> }) => {
  const url = (config.url as string) || "";
  const aspectRatio = (config.aspectRatio as string) || "16/9";

  if (!url) return null;

  const embedUrl = getEmbedUrl(url);
  if (!embedUrl) return null;

  return (
    <div className={styles.embedWidget} style={{ aspectRatio }}>
      <iframe
        src={embedUrl}
        className={styles.iframe}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        title="Embedded content"
      />
    </div>
  );
};

const HtmlWidget = ({ config }: { config: Record<string, unknown> }) => {
  const html = (config.html as string) || "";

  if (!html) return null;

  return (
    <div
      className={styles.htmlWidget}
      // biome-ignore lint/security/noDangerouslySetInnerHtml: Custom HTML widget by design
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

function getEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // YouTube
    if (
      urlObj.hostname.includes("youtube.com") ||
      urlObj.hostname.includes("youtu.be")
    ) {
      const videoId = urlObj.hostname.includes("youtu.be")
        ? urlObj.pathname.slice(1)
        : urlObj.searchParams.get("v");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    // Vimeo
    if (urlObj.hostname.includes("vimeo.com")) {
      const videoId = urlObj.pathname.split("/").pop();
      if (videoId) {
        return `https://player.vimeo.com/video/${videoId}`;
      }
    }

    // Spotify
    if (urlObj.hostname.includes("spotify.com")) {
      const path = urlObj.pathname;
      if (
        path.includes("/track/") ||
        path.includes("/album/") ||
        path.includes("/playlist/")
      ) {
        return url.replace("spotify.com", "spotify.com/embed");
      }
    }

    // SoundCloud
    if (urlObj.hostname.includes("soundcloud.com")) {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false`;
    }

    // Loom
    if (urlObj.hostname.includes("loom.com")) {
      return url.replace("/share/", "/embed/");
    }

    // Generic iframe - check if it's already an embed URL
    if (url.includes("/embed") || url.includes("player.")) {
      return url;
    }

    return null;
  } catch {
    return null;
  }
}

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
      case "header": {
        const content = (widget.config.content as string) || "";
        if (!content) return null;
        return (
          <div
            key={widget.id}
            className={styles.nestedHeader}
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
        const isYouTube =
          url.includes("youtube.com") || url.includes("youtu.be");
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
        const isEmbed =
          embedUrl.includes("youtube.com/embed") ||
          embedUrl.includes("player.vimeo.com");
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
      case "button": {
        const text = (widget.config.text as string) || "Click me";
        const url = (widget.config.url as string) || "";
        const variant = (widget.config.variant as string) || "primary";
        const size = (widget.config.size as string) || "md";
        if (!text) return null;
        return (
          <div key={widget.id} className={styles.nestedButton}>
            <a
              href={url || "#"}
              className={`${styles.button} ${styles[`button--${variant}`]} ${styles[`button--${size}`]}`}
              target={url.startsWith("http") ? "_blank" : undefined}
              rel={url.startsWith("http") ? "noopener noreferrer" : undefined}
            >
              {text}
            </a>
          </div>
        );
      }
      case "embed": {
        const url = (widget.config.url as string) || "";
        if (!url) return null;
        const embedUrl = getEmbedUrl(url);
        if (!embedUrl) return null;
        return (
          <div key={widget.id} className={styles.nestedEmbed}>
            <iframe
              src={embedUrl}
              className={styles.iframe}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Embed"
            />
          </div>
        );
      }
      case "html": {
        const html = (widget.config.html as string) || "";
        if (!html) return null;
        return (
          <div
            key={widget.id}
            className={styles.nestedHtml}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Custom HTML widget by design
            dangerouslySetInnerHTML={{ __html: html }}
          />
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
      case "container": {
        // Recursive nested container
        return (
          <div key={widget.id} className={styles.nestedContainer}>
            <ContainerWidget config={widget.config} />
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

const ContainerWidget = ({ config }: { config: Record<string, unknown> }) => {
  const children = (config.children as NestedWidget[]) || [];
  const maxWidth = (config.maxWidth as string) || "800";
  const bgColor = (config.bgColor as string) || "transparent";
  const padding = (config.padding as string) || "md";
  const alignment = (config.alignment as string) || "center";

  const getPadding = () => {
    switch (padding) {
      case "none":
        return "0";
      case "sm":
        return "12px";
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
      default:
        return "0 auto";
    }
  };

  // Don't render if container is empty
  if (children.length === 0) {
    return null;
  }

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
      case "header": {
        const content = (widget.config.content as string) || "";
        if (!content) return null;
        return (
          <div
            key={widget.id}
            className={styles.nestedHeader}
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
        const isYouTube =
          url.includes("youtube.com") || url.includes("youtu.be");
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
        const isEmbed =
          embedUrl.includes("youtube.com/embed") ||
          embedUrl.includes("player.vimeo.com");
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
      case "button": {
        const text = (widget.config.text as string) || "Click me";
        const btnUrl = (widget.config.url as string) || "";
        const variant = (widget.config.variant as string) || "primary";
        const size = (widget.config.size as string) || "md";
        if (!text) return null;
        return (
          <div key={widget.id} className={styles.nestedButton}>
            <a
              href={btnUrl || "#"}
              className={`${styles.button} ${styles[`button--${variant}`]} ${styles[`button--${size}`]}`}
              target={btnUrl.startsWith("http") ? "_blank" : undefined}
              rel={
                btnUrl.startsWith("http") ? "noopener noreferrer" : undefined
              }
            >
              {text}
            </a>
          </div>
        );
      }
      case "embed": {
        const embedSrc = (widget.config.url as string) || "";
        if (!embedSrc) return null;
        const resolvedUrl = getEmbedUrl(embedSrc);
        if (!resolvedUrl) return null;
        return (
          <div key={widget.id} className={styles.nestedEmbed}>
            <iframe
              src={resolvedUrl}
              className={styles.iframe}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Embed"
            />
          </div>
        );
      }
      case "html": {
        const html = (widget.config.html as string) || "";
        if (!html) return null;
        return (
          <div
            key={widget.id}
            className={styles.nestedHtml}
            // biome-ignore lint/security/noDangerouslySetInnerHtml: Custom HTML widget by design
            dangerouslySetInnerHTML={{ __html: html }}
          />
        );
      }
      case "columns": {
        return (
          <div key={widget.id} className={styles.nestedColumns}>
            <ColumnsWidget config={widget.config} />
          </div>
        );
      }
      case "container": {
        return (
          <div key={widget.id} className={styles.nestedContainer}>
            <ContainerWidget config={widget.config} />
          </div>
        );
      }
      default:
        return null;
    }
  };

  return (
    <div
      className={styles.containerWidget}
      style={{
        maxWidth: `${maxWidth}px`,
        padding: getPadding(),
        backgroundColor: bgColor === "transparent" ? "transparent" : bgColor,
        margin: getMargin(),
      }}
    >
      <div className={styles.containerChildren}>
        {children.map(renderNestedWidget)}
      </div>
    </div>
  );
};
