import type { ComponentProps, ElementType } from "react";

export type Extend<T, U> = Omit<T, keyof U> & U;
export type ExtendProps<T extends ElementType, U> = Extend<
  ComponentProps<T>,
  U
>;
