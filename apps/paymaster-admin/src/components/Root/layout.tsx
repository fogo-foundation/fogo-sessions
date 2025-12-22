"use client";
import { SessionStateType, useSession } from "@fogo/sessions-sdk-react";

import { Auth } from "../Auth";
import { Navbar } from "../NavBar";

export const AuthenticationLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const sessionState = useSession();

  if (sessionState.type === SessionStateType.NotEstablished) {
    return <Auth />;
  }
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};
