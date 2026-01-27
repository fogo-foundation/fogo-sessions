"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./index.module.scss";

type Stats = {
  pagesCount: number;
  membersCount: number;
  revenue: string;
};

export const DashboardHome = () => {
  const [stats, setStats] = useState<Stats>({
    pagesCount: 0,
    membersCount: 0,
    revenue: "$0",
  });

  useEffect(() => {
    // TODO: Fetch actual stats from API
    setStats({
      pagesCount: 0,
      membersCount: 0,
      revenue: "$0",
    });
  }, []);

  return (
    <div className={styles.dashboardHome}>
      <div className={styles.header}>
        <h1 className={styles.title}>Dashboard</h1>
        <p className={styles.subtitle}>Welcome back! Here's your overview.</p>
      </div>

      <div className={styles.stats}>
        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Pages</h3>
          <p className={styles.statValue}>{stats.pagesCount}</p>
          <Link href="/dashboard/pages" className={styles.statLink}>
            Manage Pages →
          </Link>
        </div>

        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Members</h3>
          <p className={styles.statValue}>{stats.membersCount}</p>
          <Link href="/dashboard/memberships" className={styles.statLink}>
            View Memberships →
          </Link>
        </div>

        <div className={styles.statCard}>
          <h3 className={styles.statLabel}>Revenue</h3>
          <p className={styles.statValue}>{stats.revenue}</p>
          <p className={styles.statNote}>Total earnings</p>
        </div>
      </div>

      <div className={styles.quickActions}>
        <h2 className={styles.sectionTitle}>Quick Actions</h2>
        <div className={styles.actionsGrid}>
          <Link href="/dashboard/pages" className={styles.actionCard}>
            <h3 className={styles.actionTitle}>Create Page</h3>
            <p className={styles.actionDescription}>
              Build a new page with our no-code page builder
            </p>
          </Link>

          <Link href="/dashboard/memberships" className={styles.actionCard}>
            <h3 className={styles.actionTitle}>Add Membership</h3>
            <p className={styles.actionDescription}>
              Create a new membership product
            </p>
          </Link>

          <Link href="/dashboard/gating-rules" className={styles.actionCard}>
            <h3 className={styles.actionTitle}>Create Gating Rule</h3>
            <p className={styles.actionDescription}>
              Define access rules for your content
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
};
