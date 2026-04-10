import type { Metadata, Viewport } from "next";

const baseMeta = {
  description:
    "Defying physics to achieve real-time experiences at scale. | SVM Layer 1 | Pure Firedancer Client | Institutional-Grade Finance",
  title: "Fogo Portfolio",
};

export const titleTemplate = "%s | Fogo | The fastest layer 1 blockchain";

export const metadata = {
  ...baseMeta,
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
  metadataBase: new URL("https://www.fogo.io/"),
  openGraph: baseMeta,
  title: {
    absolute: baseMeta.title,
    template: titleTemplate,
  },
  twitter: baseMeta,
} satisfies Metadata;

export const viewport = {
  colorScheme: "dark",
  themeColor: "#020617",
} satisfies Viewport;
