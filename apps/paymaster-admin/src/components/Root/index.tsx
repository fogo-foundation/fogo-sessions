import { FogoSessionProvider } from "@fogo/sessions-sdk-react";
import { type ReactNode } from "react";
import { DOMAIN, RPC } from "../../config/server";
import { AuthManager } from "../auth-manager";

type Props = {
  children: ReactNode;
};



export const Root = ({ children }: Props) => (
  <html lang="en">
    <body>
      <FogoSessionProvider
      endpoint={RPC}
      domain={DOMAIN}
      ><AuthManager>{children}</AuthManager></FogoSessionProvider>
      </body>
  </html>
);
