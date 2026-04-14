import type { Metadata, Viewport } from "next";

const SIZES = [72, 48];

export const metadata = {
  applicationName: "Sessions Demo App",
  description: "An app for testing Fogo sessions.",
  icons: {
    apple: {
      sizes: "180x180",
      url: "/apple-touch-icon.png",
    },
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
        sizes: `${size.toString()}x${size.toString()}`,
        type: "image/png",
        url: `/favicon-${size.toString()}x${size.toString()}.png`,
      })),
    ],
  },
  openGraph: {
    type: "website",
  },
  referrer: "strict-origin-when-cross-origin",
  robots: { follow: false, index: false },
  title: {
    default: "Sessions Demo App",
    template: "%s | Sessions Demo App",
  },
} satisfies Metadata;

export const viewport = {
  themeColor: "#242235",
} satisfies Viewport;
