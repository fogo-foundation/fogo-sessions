"use client";

import type { ComponentProps } from "react";

import { ErrorComponent } from "../components/Error";
import { LoggerProvider } from "../hooks/use-logger";

const GlobalError = (props: ComponentProps<typeof ErrorComponent>) => (
  <LoggerProvider>
    <html dir="ltr" lang="en">
      <body>
        <ErrorComponent {...props} />
      </body>
    </html>
  </LoggerProvider>
);
export default GlobalError;
