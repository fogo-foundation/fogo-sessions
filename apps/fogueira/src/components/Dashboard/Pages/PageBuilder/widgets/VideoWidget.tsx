"use client";
import { Video } from "@phosphor-icons/react";
import styles from "./VideoWidget.module.scss";

type Props = {
  config: Record<string, unknown>;
  onUpdate: (config: Record<string, unknown>) => void;
};

export const VideoWidget = ({ config }: Props) => {
  const url = config.url as string | undefined;

  if (!url) {
    return (
      <div className={styles.placeholder}>
        <Video size={32} weight="light" />
        <span>Click the gear icon to add a video</span>
      </div>
    );
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
      <div className={styles.widget}>
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

  // Direct video URL
  return (
    <div className={styles.widget}>
      {/* biome-ignore lint: Video element doesn't need captions for creator content */}
      <video src={url} controls className={styles.video}>
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

