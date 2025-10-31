"use client";
import { isEstablished, useSession } from "@fogo/sessions-sdk-react";
import type { ReactNode } from "react";
import { useCallback, useEffect } from "react";

export const AuthManager = ({ children }: { children: ReactNode }) => {
  const sessionState = useSession();
  const established = isEstablished(sessionState);
  const authenticateUser = useCallback(async () => {
    if (isEstablished(sessionState)) {
      const url = new URL(`/api/session-token`, globalThis.location.origin);
      url.searchParams.set(
        "sessionToken",
        await sessionState.createLogInToken(),
      );
      const response = await fetch(url);
      await response.json();
    }
  }, [sessionState]);
  useEffect(() => {
    if (established) {
      authenticateUser().catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error(error);
      });
    }
  }, [established, authenticateUser]);
  return children;
};
