import Link from "next/link";
import type { ReactNode } from "react";

export const ExplorerLink = ({
  signature,
  rpc,
  children,
}: {
  signature: string;
  rpc: string;
  children: ReactNode;
}) => (
  <Link
    href={`https://explorer.fogo.io/tx/${signature}?cluster=custom&customUrl=${rpc}`}
    target="_blank"
    rel="noreferrer"
    className="text-blue-700 underline"
  >
    {children}
  </Link>
);
