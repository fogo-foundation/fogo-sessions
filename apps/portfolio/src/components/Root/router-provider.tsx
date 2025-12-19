"use client";

import { useRouter, usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { useCallback } from "react";
import { RouterProvider as BaseRouterProvider } from "react-aria-components";

export const RouterProvider = (
  props: Omit<ComponentProps<typeof BaseRouterProvider>, "navigate">,
) => {
  const router = useRouter();
  const pathname = usePathname();
  const navigate = useCallback(
    (newPath: string) => {
      if (newPath === pathname) {
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        router.push(newPath);
      }
    },
    [router, pathname],
  );

  return <BaseRouterProvider navigate={navigate} {...props} />;
};
