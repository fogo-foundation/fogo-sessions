"use client";

import { useAsync } from "@react-hookz/web";
import {
  isEstablished,
  SessionStateType,
  useSession,
} from "@fogo/sessions-sdk-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  type ReactNode,
} from "react";
import { z } from "zod";

import { UserSchema } from "../db-schema";
import { UserNotFound } from "../components/UserNotFound";

type User = z.infer<typeof UserSchema>;

type UserDataContextValue = {
  userData: User | null;
  isLoading: boolean;
  error: Error | null;
  isUserNotFound: boolean;
  refetch: () => void;
};

const UserDataContext = createContext<UserDataContextValue | null>(null);

export const useUserData = () => {
  const context = useContext(UserDataContext);
  if (!context) {
    throw new Error("useUserData must be used within a UserDataProvider");
  }
  return context;
};

const fetchUserData = async (sessionToken: string): Promise<User> => {
  const response = await fetch(
    `/api/user-data?sessionToken=${encodeURIComponent(sessionToken)}`,
  );

  if (response.status === 404) {
    const error = new Error("User not found");
    (error as Error & { status: number }).status = 404;
    throw error;
  }

  if (!response.ok) {
    throw new Error("Failed to fetch user data");
  }

  return UserSchema.parse(await response.json());
};

type Props = {
  children: ReactNode;
};

export const UserDataProvider = ({ children }: Props) => {
  const sessionState = useSession();
  const established = isEstablished(sessionState);

  const [asyncState, asyncActions] = useAsync(async () => {
    if (!established) {
      return null;
    }
    const token = await sessionState.createLogInToken();
    return fetchUserData(token);
  });

  const refetch = useCallback(() => {
    if (established) {
      asyncActions.execute().catch(() => {
        // Error is captured in asyncState.error
      });
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
      userData: asyncState.result ?? null,
      isLoading: isSessionLoading || asyncState.status === "loading",
      error: isUserNotFound ? null : (asyncState.error ?? null),
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
