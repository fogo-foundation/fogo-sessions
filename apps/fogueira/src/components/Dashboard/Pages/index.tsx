"use client";
import { SessionStateType, useSession } from "@fogo/sessions-sdk-react";
import { Plus, FileText } from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageCardSkeleton } from "../Skeleton";
import styles from "./index.module.scss";

type Page = {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  createdAt: string;
  updatedAt: string;
  revisions: Array<{
    id: string;
    status: string;
    publishedAt: string | null;
  }>;
  gatingRule: {
    id: string;
    name: string;
  } | null;
};

export const PagesPage = () => {
  const session = useSession();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (session.type === SessionStateType.Established) {
      fetchPages();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const fetchPages = async () => {
    if (session.type !== SessionStateType.Established) return;

    try {
      const token = await session.createLogInToken();
      const response = await fetch("/api/creator/pages", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPages(data.pages || []);
      }
    } catch {
      // Silently fail - user can retry
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Pages</h1>
          <p className={styles.subtitle}>
            Build and manage your token-gated pages
          </p>
        </div>
        <Link href="/dashboard/pages/new" className={styles.createButton}>
          <Plus weight="bold" />
          Create Page
        </Link>
      </div>

      {loading ? (
        <div className={styles.list}>
          <PageCardSkeleton />
          <PageCardSkeleton />
          <PageCardSkeleton />
        </div>
      ) : pages.length === 0 ? (
        <div className={styles.empty}>
          <div className={styles.emptyIcon}>
            <FileText weight="duotone" />
          </div>
          <p className={styles.emptyText}>No pages yet</p>
          <p className={styles.emptySubtext}>
            Create your first page to get started
          </p>
          <Link href="/dashboard/pages/new" className={styles.emptyAction}>
            <Plus weight="bold" />
            Create Your First Page
          </Link>
        </div>
      ) : (
        <div className={styles.list}>
          {pages.map((page) => {
            const publishedRevision = page.revisions.find(
              (r) => r.status === "published",
            );
            const isPublished = !!publishedRevision;

            return (
              <Link
                key={page.id}
                href={`/dashboard/pages/${page.id}`}
                className={styles.card}
              >
                <div className={styles.cardContent}>
                  <div className={styles.cardHeader}>
                    <h3 className={styles.cardTitle}>{page.title}</h3>
                    {page.isHome && (
                      <span className={styles.homeBadge}>Home</span>
                    )}
                    {isPublished ? (
                      <span className={styles.publishedBadge}>Published</span>
                    ) : (
                      <span className={styles.draftBadge}>Draft</span>
                    )}
                  </div>
                  <p className={styles.cardSlug}>/{page.slug}</p>
                  {page.gatingRule && (
                    <p className={styles.cardGating}>
                      Gated: {page.gatingRule.name}
                    </p>
                  )}
                  <div className={styles.cardMeta}>
                    <span className={styles.cardDate}>
                      Updated {new Date(page.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

