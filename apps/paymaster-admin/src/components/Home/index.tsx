"use client";
import { StateType } from "@fogo/component-library/useData";
import { SessionButton } from "@fogo/sessions-sdk-react";

import { useUserData } from "../../client/paymaster";

export const Home = () => {
  const userData = useUserData();
  return (
    <div>
      <h1>Home</h1>
      <SessionButton />
      {userData.type === StateType.Loading && <div>Loading...</div>}
      {userData.type === StateType.Loaded && (
        <pre>{JSON.stringify(userData.data, undefined, 2)}</pre>
      )}
    </div>
  );
};
