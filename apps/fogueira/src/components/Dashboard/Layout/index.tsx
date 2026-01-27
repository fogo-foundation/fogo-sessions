"use client";
import { SessionStateType, useSession } from "@fogo/sessions-sdk-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./index.module.scss";

type Creator = {
  id: string;
  username: string;
  displayName: string;
};

export const DashboardLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const session = useSession();
  const [creator, setCreator] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);

  // Skip layout for onboard page
  const isOnboardPage = pathname === "/dashboard/onboard";

  useEffect(() => {
    // Don't fetch creator on onboard page
    if (isOnboardPage) {
      setLoading(false);
      return;
    }

    const fetchCreator = async () => {
      if (session.type !== SessionStateType.Established) {
        setLoading(false);
        return;
      }

      try {
        const token = await session.createLogInToken();
        const response = await fetch("/api/creator/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.status === 404) {
          // No creator profile, redirect to onboarding
          router.push("/dashboard/onboard");
          return;
        }

        if (!response.ok) {
          console.error("Failed to fetch creator");
          setLoading(false);
          return;
        }

        const data = await response.json();
        if (data.creator) {
          setCreator(data.creator);
        } else {
          router.push("/dashboard/onboard");
        }
      } catch (error) {
        console.error("Error fetching creator:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCreator();
  }, [session, router, isOnboardPage]);

  // On onboard page, just render children without sidebar
  if (isOnboardPage) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading...</p>
      </div>
    );
  }

  if (!creator) {
    return null; // Will redirect to onboarding
  }

  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <h2 className={styles.sidebarTitle}>Fogueira</h2>
          <p className={styles.sidebarSubtitle}>@{creator.username}</p>
        </div>
        <nav className={styles.nav}>
          <Link href="/dashboard" className={styles.navLink}>
            Overview
          </Link>
          <Link href="/dashboard/pages" className={styles.navLink}>
            Pages
          </Link>
          <Link href="/dashboard/memberships" className={styles.navLink}>
            Memberships
          </Link>
          <Link href="/dashboard/gating-rules" className={styles.navLink}>
            Gating Rules
          </Link>
          <Link href="/dashboard/assets" className={styles.navLink}>
            Assets
          </Link>
        </nav>
        <div className={styles.sidebarFooter}>
          <Link
            href={`/${creator.username}`}
            target="_blank"
            className={styles.previewLink}
          >
            View Public Page →
          </Link>
        </div>
      </aside>
      <main className={styles.main}>{children}</main>
    </div>
  );
};
