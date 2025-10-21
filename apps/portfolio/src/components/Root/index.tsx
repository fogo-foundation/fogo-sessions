import { FogoSessionProvider } from "@fogo/sessions-sdk-react";
import { GoogleAnalytics } from "@next/third-parties/google";
import clsx from "clsx";
import dynamic from "next/dynamic";
import { Funnel_Display } from "next/font/google";
import type { ReactNode } from "react";

import styles from "./index.module.scss";
import "./root.scss";
import { RouterProvider } from "./router-provider";
import {
  ENABLE_ACCESSIBILITY_REPORTING,
  GOOGLE_ANALYTICS_ID,
  DOMAIN,
  RPC,
} from "../../config/server";
import { LoggerProvider } from "../../hooks/use-logger";

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
      <html lang="en" className={clsx(sans.className, styles.root)}>
        <body className={styles.body}>
          <FogoSessionProvider endpoint={RPC} domain={DOMAIN}>
            {children}
          </FogoSessionProvider>
        </body>
        {GOOGLE_ANALYTICS_ID && <GoogleAnalytics gaId={GOOGLE_ANALYTICS_ID} />}
        {ENABLE_ACCESSIBILITY_REPORTING && <ReportAccessibility />}
      </html>
    </LoggerProvider>
  </RouterProvider>
);
