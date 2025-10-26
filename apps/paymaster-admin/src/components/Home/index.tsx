"use client";
import { SessionButton, useSession } from "@fogo/sessions-sdk-react";

export const Home = () => {
 const sessionState = useSession();
  
  return <SessionButton/>
};
