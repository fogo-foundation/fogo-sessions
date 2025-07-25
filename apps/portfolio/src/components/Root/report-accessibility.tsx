"use client";

// https://github.com/dequelabs/axe-core-npm/issues/296
import React, { useEffect } from "react";
import ReactDOM from "react-dom";

import { useLogger } from "../../hooks/use-logger";

const AXE_TIMEOUT = 1000;

export const ReportAccessibility = () => {
  useReportAccessibility();

  // eslint-disable-next-line unicorn/no-null
  return null;
};

const useReportAccessibility = () => {
  const logger = useLogger();

  useEffect(() => {
    import("@axe-core/react")
      .then((axe) => axe.default(React, ReactDOM, AXE_TIMEOUT))
      .catch((error: unknown) => {
        logger.error("Error setting up axe for accessibility testing", error);
      });
  }, [logger]);
};
