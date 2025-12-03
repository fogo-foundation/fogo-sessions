"use client";
import {
  isEstablished,
  SessionStateType,
  useSession,
} from "@fogo/sessions-sdk-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useCallback, useEffect } from "react";

export const AuthManager = ({ children }: { children: ReactNode }) => {
  const router = useRouter();
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
      router.refresh();
    }
  }, [sessionState, router]);

  const logoutUser = useCallback(async () => {
    const response = await fetch("/api/logout");
    await response.json();
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (established) {
      void authenticateUser();
    } else if (sessionState.type === SessionStateType.NotEstablished) {
      void logoutUser();
    }
  }, [established, authenticateUser, sessionState.type, logoutUser]);

  return children;
};
