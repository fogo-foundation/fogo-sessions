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

import { fetchUserData, UserNotFoundError } from "../client/paymaster";
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
  const sessionStateEstablished = isEstablished(sessionState);

  const [userDataState, userDataActions] = useAsync(async () => {
    if (!sessionStateEstablished) {
      return;
    }
    return fetchUserData(await sessionState.createLogInToken());
  });

  const refetch = useCallback(async () => {
    if (sessionStateEstablished) {
      await userDataActions.execute();
    }
  }, [sessionStateEstablished, userDataActions]);

  useEffect(() => {
    if (sessionStateEstablished) {
      userDataActions.execute().catch((error: unknown) => {
        // eslint-disable-next-line no-console
        console.error("Failed to fetch user data", error);
      });
    } else {
      userDataActions.reset();
    }
  }, [sessionStateEstablished, userDataActions]);

  const isSessionLoading = [
    SessionStateType.Initializing,
    SessionStateType.CheckingStoredSession,
    SessionStateType.WalletConnecting,
    SessionStateType.SettingLimits,
  ].includes(sessionState.type);
  const isUserNotFound = userDataState.error instanceof UserNotFoundError;

  const isLoading = isSessionLoading || userDataState.status === "loading";

  const contextValue = useMemo<UserDataContextValue>(
    () => ({
      userData: userDataState.result,
      isLoading,
      error: userDataState.error,
      isUserNotFound,
      refetch,
    }),
    [userDataState, isLoading, isUserNotFound, refetch],
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
