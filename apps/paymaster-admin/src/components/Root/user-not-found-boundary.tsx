"use client";
import { StateType } from "@fogo/component-library/useData";

import { UserNotFoundError, useUserData } from "../../client/paymaster";
import { UserNotFound } from "../UserNotFound";

export const UserNotFoundBoundary = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const userData = useUserData();
  const isUserNotFoundError =
    userData.type === StateType.Error &&
    userData.error.cause instanceof UserNotFoundError;
  if (isUserNotFoundError) {
    return <UserNotFound />;
  }
  return children;
};
