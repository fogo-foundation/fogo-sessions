import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
};

export const Root = ({ children }: Props) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);
