import type { MetadataRoute } from "next";

import { metadata } from "../metadata";

const SIZES = [1024, 512, 384, 192, 128, 96, 72, 48];

const manifest = (): MetadataRoute.Manifest => ({
  name: metadata.title.absolute,
  short_name: metadata.applicationName,
  description: metadata.description,
  start_url: "/",
  display: "browser",
  orientation: "portrait",
  background_color: "#020617",
  theme_color: "#ff3d00",
  icons: [
    {
      src: "/web-app-manifest.svg",
      sizes: "any",
      type: "image/svg+xml",
      purpose: "any",
    },
    ...SIZES.map((size) => size.toString()).map((size) => ({
      src: `/web-app-manifest-${size}x${size}.png`,
      sizes: `${size}x${size}`,
      type: "image/png",
      purpose: "any" as const,
    })),
  ],
});

export default manifest;
