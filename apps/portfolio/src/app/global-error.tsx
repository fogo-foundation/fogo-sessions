"use client";

import type { ComponentProps } from "react";

import { Error } from "../components/Error";
import { LoggerProvider } from "../hooks/use-logger";

const GlobalError = (props: ComponentProps<typeof Error>) => (
  <LoggerProvider>
    <html lang="en" dir="ltr">
      <body>
        <Error {...props} />
      </body>
    </html>
  </LoggerProvider>
);
export default GlobalError;
