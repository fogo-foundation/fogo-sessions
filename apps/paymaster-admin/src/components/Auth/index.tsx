"use client";
import {
  isEstablished,
  SessionButton,
  useSession,
} from "@fogo/sessions-sdk-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export const Auth = () => {
  const sessionState = useSession();
  const router = useRouter();

  useEffect(() => {
    if (isEstablished(sessionState)) {
      router.push("/apps");
    }
  }, [sessionState, router]);

  return (
    <div>
      <h1>Auth</h1>
      this is the auth screen
      <SessionButton />
    </div>
  );
};
