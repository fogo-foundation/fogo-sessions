import '@fogo/sessions-sdk-react/theme';

import { FogoSessionProvider, SessionButton } from "@fogo/sessions-sdk-react";
import { NATIVE_MINT } from "@solana/spl-token";
import type { ReactNode } from "react";

import styles from "./index.module.scss";
import { PROVIDER_CONFIG } from "../../config/server";

type Props = {
  children: ReactNode;
};

export const Root = ({ children }: Props) => (
  <html lang="en" className={styles.root}>
    <body>
      <FogoSessionProvider
        tokens={[NATIVE_MINT.toBase58()]}
        defaultRequestedLimits={{
          [NATIVE_MINT.toBase58()]: 1_500_000_000n,
        }}
        enableUnlimited
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
