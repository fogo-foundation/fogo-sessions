"use client";
import { Code } from "@phosphor-icons/react";
import styles from "./EmbedWidget.module.scss";

type Props = {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
};

export const EmbedWidget = ({ config }: Props) => {
  const url = (config.url as string) || "";
  const aspectRatio = (config.aspectRatio as string) || "16/9";

  if (!url) {
    return (
      <div className={styles.placeholder}>
        <Code size={32} weight="light" />
        <span>Add an embed URL in settings</span>
      </div>
    );
  }

  // Detect embed type and get the embed URL
  const embedUrl = getEmbedUrl(url);

  if (!embedUrl) {
    return (
      <div className={styles.placeholder}>
        <Code size={32} weight="light" />
        <span>Unsupported embed URL</span>
      </div>
    );
  }

  return (
    <div className={styles.container} style={{ aspectRatio }}>
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

function getEmbedUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);

    // YouTube
    if (urlObj.hostname.includes("youtube.com") || urlObj.hostname.includes("youtu.be")) {
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
      if (path.includes("/track/") || path.includes("/album/") || path.includes("/playlist/")) {
        return url.replace("spotify.com", "spotify.com/embed");
      }
    }

    // SoundCloud - needs oEmbed, so just use the URL directly
    if (urlObj.hostname.includes("soundcloud.com")) {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%23ff5500&auto_play=false`;
    }

    // Twitter/X embeds
    if (urlObj.hostname.includes("twitter.com") || urlObj.hostname.includes("x.com")) {
      // Twitter embeds require their embed script, so we can't iframe them
      return null;
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

