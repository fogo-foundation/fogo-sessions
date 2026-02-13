import { FogoSessionProvider, Network } from "@fogo/sessions-sdk-react";
import type { ReactNode } from "react";
import { DOMAIN } from "../../config/server";
import { AuthenticationLayout } from "./layout";
import "./root.scss";
import { I18nProvider } from "@fogo/component-library/I18nProvider";
import { ToastProvider } from "@fogo/component-library/Toast";
import styles from "./layout.module.scss";

type Props = {
  children: ReactNode;
};

export const Root = ({ children }: Props) => (
  <html className={styles.root} lang="en">
    <body className={styles.root}>
      <I18nProvider>
        <ToastProvider>
          <FogoSessionProvider
            domain={DOMAIN}
            enableUnlimited={false}
            network={Network.Testnet}
            privacyPolicyUrl="https://www.dourolabs.xyz/Privacy-Notice.pdf"
            termsOfServiceUrl="https://www.dourolabs.xyz/Paymaster-Terms-Of-Service.pdf"
          >
            <AuthenticationLayout>{children}</AuthenticationLayout>
          </FogoSessionProvider>
        </ToastProvider>
      </I18nProvider>
    </body>
  </html>
);
