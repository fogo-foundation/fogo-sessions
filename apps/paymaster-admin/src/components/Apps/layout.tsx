"use client";
import { SessionStateType, useSession } from "@fogo/sessions-sdk-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Navbar } from "../Navbar";

export const AuthenticatedLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const sessionState = useSession();
  const router = useRouter();

  useEffect(() => {
    if (sessionState.type === SessionStateType.NotEstablished) {
      router.push("/auth");
    }
  }, [sessionState.type, router]);
  return (
    <>
      <Navbar />
      {children}
    </>
  );
};
