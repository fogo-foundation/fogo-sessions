import { FogoSessionProvider, SessionButton } from "@fogo/sessions-sdk-react";
import { NATIVE_MINT } from "@solana/spl-token";
import type { ReactNode } from "react";

import {
  SPONSOR_KEY,
  SOLANA_RPC,
  ADDRESS_LOOKUP_TABLE_ADDRESS,
  FOGO_SESSIONS_DOMAIN,
} from "@/config/server";

type Props = {
  children: ReactNode;
};

export const Root = ({ children }: Props) => {
  return (
    <html lang="en">
      <body>
        <FogoSessionProvider
          endpoint={SOLANA_RPC}
          addressLookupTableAddress={ADDRESS_LOOKUP_TABLE_ADDRESS}
          sponsor={SPONSOR_KEY.publicKey.toBase58()}
          paymasterUrl="/api/sponsor_and_send"
          tokens={[NATIVE_MINT.toBase58()]}
          defaultRequestedLimits={{
            [NATIVE_MINT.toBase58()]: 1_500_000_000n,
          }}
          domain={FOGO_SESSIONS_DOMAIN}
        >
          <header className="h-16 border-b border-black">
            <div className="h-full flex flex-row items-center justify-between m-auto px-4 sm:px-10 lg:px-0 lg:w-3/5">
              <h1 className="text-2xl font-medium">Fogo Sessions Demo</h1>
              <SessionButton />
            </div>
          </header>
          <main className="m-auto px-4 sm:px-10 lg:px-0 lg:w-3/5 mt-10">
            {children}
          </main>
        </FogoSessionProvider>
      </body>
    </html>
  );
};
