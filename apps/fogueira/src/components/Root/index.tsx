import { FogoSessionProvider, Network } from "@fogo/sessions-sdk-react";
import type { ReactNode } from "react";
import { DOMAIN } from "../../config/server";
import "./root.scss";
import styles from "./layout.module.scss";

type Props = {
  children: ReactNode;
};

export const Root = ({ children }: Props) => (
  <html lang="en" className={styles.root}>
    <body className={styles.root}>
      <FogoSessionProvider network={Network.Testnet} domain={DOMAIN}>
        <AuthenticationLayout>{children}</AuthenticationLayout>
      </FogoSessionProvider>
    </body>
  </html>
);
