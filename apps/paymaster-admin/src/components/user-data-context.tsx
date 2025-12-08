"use client";

import {
  isEstablished,
  SessionStateType,
  useSession,
} from "@fogo/sessions-sdk-react";
import { useAsync } from "@react-hookz/web";
import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from "react";

import { fetchUserData } from "../client/paymaster";
import { UserNotFound } from "../components/UserNotFound";
import type { User } from "../db-schema";

type UserDataContextValue = {
  userData: User | undefined;
  isLoading: boolean;
  error: Error | undefined;
  isUserNotFound: boolean;
  refetch: () => Promise<void>;
};

const UserDataContext = createContext<UserDataContextValue | undefined>(
  undefined,
);

export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error("useUserData must be used within a UserDataProvider");
  }
  return context;
};

export const UserDataProvider = ({ children }: { children: ReactNode }) => {
  const sessionState = useSession();
  const established = isEstablished(sessionState);

  const [asyncState, asyncActions] = useAsync(async () => {
    if (!established) {
      return;
    }
    const token = await sessionState.createLogInToken();
    return fetchUserData(token);
  });

  const refetch = useCallback(async () => {
    if (established) {
      await asyncActions.execute();
    }
  }, [established, asyncActions]);

  // Fetch user data when session becomes established
  useEffect(() => {
    if (established) {
      asyncActions.execute().catch(() => {
        // Error is captured in asyncState.error
      });
    } else {
      asyncActions.reset();
    }
  }, [established, asyncActions]);

  const isSessionLoading = [
    SessionStateType.Initializing,
    SessionStateType.CheckingStoredSession,
    SessionStateType.WalletConnecting,
    SessionStateType.SettingLimits,
  ].includes(sessionState.type);

  const isUserNotFound =
    asyncState.error !== undefined &&
    (asyncState.error as Error & { status?: number }).status === 404;

  const contextValue = useMemo<UserDataContextValue>(
    () => ({
      userData: asyncState.result ?? undefined,
      isLoading: isSessionLoading || asyncState.status === "loading",
      error: isUserNotFound ? undefined : (asyncState.error ?? undefined),
      isUserNotFound,
      refetch,
    }),
    [asyncState, isSessionLoading, isUserNotFound, refetch],
  );

  if (isUserNotFound) {
    return <UserNotFound />;
  }

  return (
    <UserDataContext.Provider value={contextValue}>
      {children}
    </UserDataContext.Provider>
  );
};
