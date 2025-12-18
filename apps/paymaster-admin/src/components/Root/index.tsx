import { FogoSessionProvider, Network } from "@fogo/sessions-sdk-react";
import type { ReactNode } from "react";

import { UserNotFoundBoundary } from "./user-not-found-boundary";
import { DOMAIN } from "../../config/server";

type Props = {
  children: ReactNode;
};

export const Root = ({ children }: Props) => (
  <html lang="en">
    <body>
      <FogoSessionProvider network={Network.Testnet} domain={DOMAIN}>
        <UserNotFoundBoundary>{children}</UserNotFoundBoundary>
      </FogoSessionProvider>
    </body>
  </html>
);
