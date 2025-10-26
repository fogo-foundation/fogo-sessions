"use client";
import { isEstablished, useSession } from "@fogo/sessions-sdk-react";
import { useCallback, useEffect, type ReactNode } from "react";

export const AuthManager = ({ children }: { children: ReactNode }) => {
  const sessionState = useSession();
 const established = isEstablished(sessionState);

  const authenticateUser = useCallback(async () => {
    const url = new URL(`/api/session-token`, window.location.origin);
    url.searchParams.set("sessionToken", await sessionState.createLogInToken());
    const response = await fetch(url);
    const data = await response.json();
    console.log("data",   data);
  }, [sessionState]);
  useEffect(() => {
    if (established) {
      authenticateUser();
    }
  }, [established, authenticateUser]);
  return children;
}
