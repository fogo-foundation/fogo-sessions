"use client";

import { createWidget } from "@fogo/sessions-sdk-web";
import { useRef, useEffect } from "react";

export const Widget = () => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = ref.current;
    const widget = createWidget();

    // istanbul ignore if
    if (container === null) {
      throw new Error("Invariant failed: container ref is null");
    } else {
      container.append(widget);
      return () => {
        widget.remove();
      };
    }
  }, []);

  return <div ref={ref} />;
};
