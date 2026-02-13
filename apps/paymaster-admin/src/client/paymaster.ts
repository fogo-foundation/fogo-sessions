import { useData } from "@fogo/component-library/useData";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import { useCallback } from "react";

import type { User } from "../db-schema";
import { UserSchema } from "../db-schema";

export const useUserData = (sessionState: EstablishedSessionState) => {
  const getUserData = useCallback(async () => {
    if (sessionState.expiration < new Date()) {
      sessionState.requestExtendedExpiry(() => {
        sessionState.endSession();
      });
    }
    const sessionToken = await sessionState.createLogInToken();
    return fetchUserData(sessionToken);
  }, [sessionState]);

  return useData(
    ["user-data", sessionState.walletPublicKey.toBase58() + sessionState.expiration.toISOString()],
    getUserData,
    { revalidateOnFocus: true },
  );
};

export enum FetchUserDataStateType {
  Success,
  NotFound,
}

export type FetchUserDataResult =
  | { type: FetchUserDataStateType.Success; user: User }
  | { type: FetchUserDataStateType.NotFound };

export const fetchUserData = async (
  sessionToken: string,
): Promise<FetchUserDataResult> => {
  const url = new URL("/api/auth/user-data", globalThis.location.origin);
  url.searchParams.set("sessionToken", sessionToken);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (response.status === 404) {
    return { type: FetchUserDataStateType.NotFound };
  } else if (response.ok) {
    return {
      type: FetchUserDataStateType.Success,
      user: UserSchema.parse(await response.json()),
    };
  } else {
    throw new Error(
      `Failed to fetch user data: ${response.status.toString()} ${response.statusText}`,
    );
  }
};
