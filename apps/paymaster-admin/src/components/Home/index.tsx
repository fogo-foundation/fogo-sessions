"use client";
import { SessionButton } from "@fogo/sessions-sdk-react";

import { useUserData } from "../user-data-context";
import Link from "next/dist/client/link";

export const Home = () => {
  const { userData, isLoading, error, isUserNotFound, refetch } = useUserData();
  return (
    <div>
      <h1>Home</h1>
      <SessionButton />
      Apps:
      {userData?.apps.map((app) => (
          <li key={app.id}>
            <Link href={`/${app.id}`}>{app.name}</Link>
          </li>
        ))}
      {isLoading && <div>Loading...</div>}
      {error && <div>Error: {error.message}</div>}
      {isUserNotFound && <div>User not found</div>}
      {userData && <button onClick={() => void refetch()}>Refetch</button>}
    </div>
  );
};
