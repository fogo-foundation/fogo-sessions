import { GoogleAnalytics } from "@next/third-parties/google";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { Funnel_Display } from "next/font/google";
import Link from "next/link";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";

import { FogoSessionProvider } from "./fogo-session-provider";
import styles from "./index.module.scss";
import "./root.scss";
import {
  DOMAIN,
  ENABLE_ACCESSIBILITY_REPORTING,
  GOOGLE_ANALYTICS_ID,
} from "../../config/server";
import { LoggerProvider } from "../../hooks/use-logger";
import { FogoWordmark } from "../Home/fogo-wordmark";
import { FogoNetworkProvider } from "./network-provider";
import { NetworkSelect } from "./network-select";
import { RouterProvider } from "./router-provider";

const ReportAccessibility = dynamic(() =>
  import("./report-accessibility").then((mod) => mod.ReportAccessibility),
);

const sans = Funnel_Display({
  subsets: ["latin"],
  variable: "--font-sans",
});

type Props = {
  children: ReactNode;
};

export const Root = ({ children }: Props) => (
  <RouterProvider>
    <LoggerProvider>
      <NuqsAdapter>
        <html lang="en" className={clsx(sans.className, styles.root)}>
          <body className={styles.body}>
            <FogoNetworkProvider>
              <header className={styles.header}>
                <FogoWordmark className={styles.fogoWordmark} />
                <NetworkSelect />
              </header>
              <FogoSessionProvider domain={DOMAIN}>
                {children}
              </FogoSessionProvider>
              <footer className={styles.footer}>
                <Link
                  className={styles.link}
                  href="https://api.fogo.io/terms-of-use.pdf"
                  target="_blank"
                >
                  Terms of Use
                </Link>
              </footer>
            </FogoNetworkProvider>
          </body>
          {GOOGLE_ANALYTICS_ID && (
            <GoogleAnalytics gaId={GOOGLE_ANALYTICS_ID} />
          )}
          {ENABLE_ACCESSIBILITY_REPORTING && <ReportAccessibility />}
        </html>
      </NuqsAdapter>
    </LoggerProvider>
  </RouterProvider>
);
