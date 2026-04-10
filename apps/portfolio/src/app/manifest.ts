import type { MetadataRoute } from "next";

import { metadata } from "../metadata";

const SIZES = [1024, 512, 384, 192, 128, 96, 72, 48];

const manifest = (): MetadataRoute.Manifest => ({
  background_color: "#020617",
  description: metadata.description,
  display: "browser",
  icons: [
    {
      purpose: "any",
      sizes: "any",
      src: "/web-app-manifest.svg",
      type: "image/svg+xml",
    },
    ...SIZES.map((size) => size.toString()).map((size) => ({
      purpose: "any" as const,
      sizes: `${size}x${size}`,
      src: `/web-app-manifest-${size}x${size}.png`,
      type: "image/png",
    })),
  ],
  name: metadata.title.absolute,
  orientation: "portrait",
  short_name: metadata.applicationName,
  start_url: "/",
  theme_color: "#ff3d00",
});

export default manifest;
