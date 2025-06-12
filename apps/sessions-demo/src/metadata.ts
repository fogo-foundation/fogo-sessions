import type { Metadata, Viewport } from "next";

const SIZES = [72, 48];

export const metadata = {
  title: {
    default: "Gasless Trading App",
    template: "%s | Gasless Trading App",
  },
  applicationName: "Gasless Trading App",
  description: "A gasless trading app.",
  referrer: "strict-origin-when-cross-origin",
  openGraph: {
    type: "website",
  },
  icons: {
    icon: [
      {
        media: "(prefers-color-scheme: light)",
        type: "image/x-icon",
        url: "/favicon.ico",
      },
      {
        media: "(prefers-color-scheme: dark)",
        type: "image/x-icon",
        url: "/favicon-light.ico",
      },
      ...SIZES.map((size) => ({
        type: "image/png",
        sizes: `${size.toString()}x${size.toString()}`,
        url: `/favicon-${size.toString()}x${size.toString()}.png`,
      })),
    ],
    apple: {
      url: "/apple-touch-icon.png",
      sizes: "180x180",
    },
  },
  robots: { index: false, follow: false },
} satisfies Metadata;

export const viewport = {
  themeColor: "#242235",
} satisfies Viewport;
