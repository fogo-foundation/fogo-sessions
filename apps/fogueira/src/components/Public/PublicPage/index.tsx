"use client";
import { useEffect, useState } from "react";
import { WidgetRenderer } from "./WidgetRenderer";
import styles from "./index.module.scss";

type Widget = {
  id: string;
  widgetType: string;
  config: Record<string, unknown>;
  orderIndex: number;
};

type Page = {
  id: string;
  title: string;
  slug: string;
  isHome: boolean;
  widgets: Widget[];
};

type Props = {
  username: string;
  slug?: string;
};

export const PublicPage = ({ username, slug }: Props) => {
  const [page, setPage] = useState<Page | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPage = async () => {
      try {
        const url = slug
          ? `/api/public/pages/${username}?slug=${slug}`
          : `/api/public/pages/${username}`;

        const response = await fetch(url);

        if (!response.ok) {
          const data = await response.json();
          setError(data.error || "Page not found");
          setLoading(false);
          return;
        }

        const data = await response.json();
        setPage(data.page);
      } catch {
        setError("Failed to load page");
      } finally {
        setLoading(false);
      }
    };

    fetchPage();
  }, [username, slug]);

  if (loading) {
    return (
      <div className={styles.loading}>
        <p>Loading...</p>
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className={styles.error}>
        <h1 className={styles.errorTitle}>Page Not Found</h1>
        <p className={styles.errorText}>
          {error || "The page you're looking for doesn't exist."}
        </p>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <main className={styles.content}>
        {page.widgets.length === 0 ? (
          <div className={styles.empty}>
            <p>This page has no content yet.</p>
          </div>
        ) : (
          <div className={styles.widgets}>
            {page.widgets.map((widget) => (
              <WidgetRenderer key={widget.id} widget={widget} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

