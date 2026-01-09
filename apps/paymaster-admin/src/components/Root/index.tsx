import { FogoSessionProvider, Network } from "@fogo/sessions-sdk-react";
import type { ReactNode } from "react";
import { DOMAIN } from "../../config/server";
import { AuthenticationLayout } from "./layout";
import "./root.scss";
import { I18nProvider } from "@fogo/component-library/I18nProvider";
import styles from "./layout.module.scss";

type Props = {
  children: ReactNode;
};

export const Root = ({ children }: Props) => (
  <html lang="en" className={styles.root}>
    <body className={styles.root}>
      <I18nProvider>
        <FogoSessionProvider network={Network.Testnet} domain={DOMAIN}>
          <AuthenticationLayout>{children}</AuthenticationLayout>
        </FogoSessionProvider>
      </I18nProvider>
    </body>
  </html>
);
