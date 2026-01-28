"use client";
import { SessionStateType, useSession } from "@fogo/sessions-sdk-react";
import { usePathname } from "next/navigation";

import { Auth } from "../Auth";
import { Footer } from "../Footer";
import { Navbar } from "../Navbar";
import { CreatorNavbar } from "../Public/CreatorNavbar";
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

  // Check if we're on a creator page (/{username} or /{username}/{slug})
  const creatorPageMatch = pathname?.match(/^\/([^/]+)(?:\/([^/]+))?$/);
  const isCreatorPage =
    creatorPageMatch &&
    !isDashboardRoute &&
    pathname !== "/" &&
    !pathname?.startsWith("/api");

  // Extract username from pathname for creator pages
  const username = isCreatorPage ? creatorPageMatch[1] : null;

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
      {isCreatorPage && username ? (
        <CreatorNavbar username={username} />
      ) : (
        <Navbar />
      )}
      <main className={styles.main}>{children}</main>
      <Footer />
    </>
  );
};
