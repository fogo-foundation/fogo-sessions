"use client";
import { SessionStateType, useSession } from "@fogo/sessions-sdk-react";

import { Auth } from "../Auth";
import { Footer } from "../Footer";
import { Navbar } from "../Navbar";
import styles from "./layout.module.scss";

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
      <main className={styles.main}>{children}</main>
      <Footer />
    </>
  );
};
