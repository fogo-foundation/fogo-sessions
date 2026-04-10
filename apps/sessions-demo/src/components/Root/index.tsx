import { FogoSessionProvider, SessionButton } from "@fogo/sessions-sdk-react";
import { NATIVE_MINT } from "@solana/spl-token";
import type { ReactNode } from "react";
import { PROVIDER_CONFIG } from "../../config/server";
import styles from "./index.module.scss";

type Props = {
  children: ReactNode;
};

export const Root = ({ children }: Props) => (
  <html className={styles.root} lang="en">
    <body>
      <FogoSessionProvider
        defaultRequestedLimits={{
          [NATIVE_MINT.toBase58()]: 1_500_000_000n,
        }}
        enableUnlimited
        tokens={[NATIVE_MINT.toBase58()]}
        {...PROVIDER_CONFIG}
      >
        <header className={styles.header}>
          <div className={styles.contents}>
            <h1 className={styles.heading}>Fogo Sessions Demo</h1>
            <SessionButton />
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </FogoSessionProvider>
    </body>
  </html>
);
