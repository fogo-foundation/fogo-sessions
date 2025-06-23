import type { Metadata, Viewport } from "next";

const baseMeta = {
  title: "Fogo | The fastest layer 1 blockchain",
  description:
    "Defying physics to achieve real-time experiences at scale. | SVM Layer 1 | Pure Firedancer Client | Institutional-Grade Finance",
};

export const titleTemplate = "%s | Fogo | The fastest layer 1 blockchain";

export const metadata = {
  ...baseMeta,
  metadataBase: new URL("https://www.fogo.io/"),
  title: {
    absolute: baseMeta.title,
    template: titleTemplate,
  },
  applicationName: "Fogo",
  keywords: [
    "svm",
    "solana",
    "crypto",
    "blockchain",
    "l1",
    "tps",
    "block time",
  ],
  openGraph: baseMeta,
  twitter: baseMeta,
} satisfies Metadata;

export const viewport = {
  colorScheme: "dark",
  themeColor: "#020617",
} satisfies Viewport;
