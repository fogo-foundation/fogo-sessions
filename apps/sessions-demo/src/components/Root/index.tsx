import { FogoSessionProvider, SessionButton } from "@fogo/sessions-sdk-react";
import { NATIVE_MINT } from "@solana/spl-token";
import type { ReactNode } from "react";

import styles from "./index.module.scss";
import {
  RPC,
  ADDRESS_LOOKUP_TABLE_ADDRESS,
  FOGO_SESSIONS_DOMAIN,
  PAYMASTER,
} from "../../config/server";

type Props = {
  children: ReactNode;
};

export const Root = ({ children }: Props) => (
  <html lang="en" className={styles.root}>
    <body>
      <FogoSessionProvider
        endpoint={RPC}
        addressLookupTableAddress={ADDRESS_LOOKUP_TABLE_ADDRESS}
        paymaster={PAYMASTER}
        tokens={[NATIVE_MINT.toBase58()]}
        defaultRequestedLimits={{
          [NATIVE_MINT.toBase58()]: 1_500_000_000n,
        }}
        enableUnlimited
        domain={FOGO_SESSIONS_DOMAIN}
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
