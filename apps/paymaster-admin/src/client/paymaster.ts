import type { Cache } from "@fogo/component-library/useData";
import { useData, useSWRConfig } from "@fogo/component-library/useData";
import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import { useCallback, useEffect } from "react";

import type { User } from "../db-schema";
import { UserSchema } from "../db-schema";

export type FetchUserDataResult =
  | { type: FetchUserDataStateType.Success; user: User; expiration: Date }
  | { type: FetchUserDataStateType.NotFound };

export const useUserData = (sessionState: EstablishedSessionState) => {
  const cacheKey = "user-data" + sessionState.walletPublicKey.toString();
  const { mutate, cache } = useSWRConfig();
  const getUserData = useCallback(async () => {
    if (sessionState.expiration < new Date()) {
      sessionState.requestExtendedExpiry({ clearSessionOnCancel: true });
    }
    return await fetchUserData(sessionState);
  }, [sessionState]);

  const cachedData = (cache as Cache<FetchUserDataResult>).get(cacheKey);

  // this invalidates the cache if the session is expired
  // we set the session expiration in an `expiration` entry after the data is fetched
  useEffect(() => {
    if (
      cachedData?.data?.type === FetchUserDataStateType.Success &&
      cachedData.data.expiration.getTime() <= Date.now()
    ) {
      cache.delete(cacheKey);
      mutate(cacheKey, undefined, { revalidate: true });
    }
  }, [cachedData, mutate, cache, cacheKey]);

  return useData(cacheKey, getUserData, { revalidateOnFocus: true });
};

export enum FetchUserDataStateType {
  Success,
  NotFound,
}

export const fetchUserData = async (
  sessionState: EstablishedSessionState,
): Promise<FetchUserDataResult> => {
  const sessionToken = await sessionState.createLogInToken();
  const expiration = sessionState.expiration;

  const url = new URL("/api/auth/user-data", globalThis.location.origin);
  url.searchParams.set("sessionToken", sessionToken);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${sessionToken}` },
  });
  if (response.status === 404) {
    return { type: FetchUserDataStateType.NotFound };
  } else if (response.ok) {
    return {
      expiration,
      type: FetchUserDataStateType.Success,
      user: UserSchema.parse(await response.json()),
    };
  } else {
    throw new Error(
      `Failed to fetch user data: ${response.status.toString()} ${response.statusText}`,
    );
  }
};
