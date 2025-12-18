import { useData } from "@fogo/component-library/useData";
import { isEstablished, useSession } from "@fogo/sessions-sdk-react";
import { useCallback, useEffect } from "react";
import { mutate } from "swr";

import { UserSchema } from "../db-schema";

export const useUserData = () => {
  const sessionState = useSession();
  const readyToFetch = isEstablished(sessionState);

  const getUserData = useCallback(async () => {
    if (readyToFetch) {
      const sessionToken = await sessionState.createLogInToken();
      return fetchUserData(sessionToken);
    }
    return;
  }, [sessionState, readyToFetch]);

  useEffect(() => {
    // revalidate when the user connects/disconnects/switches wallets
    mutate(["user-data"]).catch((error: unknown) => {
      // eslint-disable-next-line no-console
      console.error("Failed to revalidate user data", error);
    });
  }, [readyToFetch]);
  return useData(["user-data"], getUserData, { revalidateOnFocus: true });
};

export const fetchUserData = async (sessionToken: string) => {
  const url = new URL("/api/auth/user-data", globalThis.location.origin);
  url.searchParams.set("sessionToken", sessionToken);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (response.status === 404) {
    throw new UserNotFoundError();
  } else if (response.ok) {
    return UserSchema.parse(await response.json());
  } else {
    throw new Error("Failed to fetch user data");
  }
};

export class UserNotFoundError extends Error {
  constructor() {
    super("User not found");
    this.name = "UserNotFoundError";
  }
}
