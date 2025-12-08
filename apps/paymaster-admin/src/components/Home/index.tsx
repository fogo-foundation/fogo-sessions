"use client";
import { SessionButton } from "@fogo/sessions-sdk-react";

import { useUserData } from "../user-data-context";

export const Home = () => {
  const { userData, isLoading, error, isUserNotFound, refetch } = useUserData();
  return (
    <div>
      <h1>Home</h1>
      <SessionButton />
      {userData && <pre>{JSON.stringify(userData, undefined, 2)}</pre>}
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {isUserNotFound && <div>User not found</div>}
      <button onClick={refetch}>Refetch</button>
    </div>
  );
};
