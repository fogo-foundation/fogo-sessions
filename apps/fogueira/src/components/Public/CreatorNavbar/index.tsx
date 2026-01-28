"use client";
import { SessionButton } from "@fogo/sessions-sdk-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import styles from "./index.module.scss";

type Page = {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
};

type Props = {
  username: string;
};

export const CreatorNavbar = ({ username }: Props) => {
  const pathname = usePathname();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPages = async () => {
      try {
        const response = await fetch(`/api/public/creators/${username}/pages`);
        if (response.ok) {
          const data = await response.json();
          setPages(data.pages || []);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };

    fetchPages();
  }, [username]);

  const getPageUrl = (page: Page) => {
    if (page.isHome) {
      return `/${username}`;
    }
    return `/${username}/${page.slug}`;
  };

  const isActive = (page: Page) => {
    if (page.isHome) {
      return pathname === `/${username}`;
    }
    return pathname === `/${username}/${page.slug}`;
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.navContent}>
        <Link href={`/${username}`} className={styles.logo}>
          @{username}
        </Link>
        {loading ? (
          <div className={styles.navLinks}>
            <span className={styles.loading}>Loading pages...</span>
          </div>
        ) : pages.length > 0 ? (
          <div className={styles.navLinks}>
            {pages.map((page) => (
              <Link
                key={page.id}
                href={getPageUrl(page)}
                className={`${styles.navLink} ${isActive(page) ? styles.active : ""}`}
              >
                {page.title}
              </Link>
            ))}
          </div>
        ) : null}
        <div className={styles.walletWidget}>
          <SessionButton />
        </div>
      </div>
    </nav>
  );
};

