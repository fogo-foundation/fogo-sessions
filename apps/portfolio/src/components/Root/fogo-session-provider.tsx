"use client";

import { FogoSessionProvider as FogoSessionProviderImpl } from "@fogo/sessions-sdk-react";
import type { ComponentProps } from "react";

import { useNetwork } from "./network-provider";

type Props = ConstrainedOmit<
  ComponentProps<typeof FogoSessionProviderImpl>,
  "network"
>;

export const FogoSessionProvider = (props: Props) => {
  const { network } = useNetwork();
  return <FogoSessionProviderImpl network={network} {...props} />;
};

type ConstrainedOmit<T, K> = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [P in keyof T as Exclude<P, K & keyof any>]: T[P];
};
