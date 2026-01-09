"use client";

import type { ComponentProps } from "react";
import React from "react";
import { I18nProvider as I18nProviderBase } from "react-aria";

export const I18nProvider = (
  props: Omit<ComponentProps<typeof I18nProviderBase>, "locale">,
) => {
  return <I18nProviderBase locale="en-US" {...props} />;
};
