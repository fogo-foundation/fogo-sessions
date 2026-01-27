"use client";
import { SessionStateType, useSession } from "@fogo/sessions-sdk-react";
import { usePathname } from "next/navigation";

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
  const pathname = usePathname();

  // Public routes don't require authentication
  // Dashboard routes require auth, everything else is public
  const isDashboardRoute = pathname?.startsWith("/dashboard");

  if (
    isDashboardRoute &&
    (sessionState.type === SessionStateType.NotEstablished ||
      sessionState.type === SessionStateType.SelectingWallet ||
      sessionState.type === SessionStateType.RequestingLimits ||
      sessionState.type === SessionStateType.SettingLimits ||
      sessionState.type === SessionStateType.WalletConnecting)
  ) {
    // Only require auth for dashboard routes
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
