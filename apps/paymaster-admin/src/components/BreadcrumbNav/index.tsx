"use client";

import { Link } from "@fogo/component-library/Link";
import { Skeleton } from "@fogo/component-library/Skeleton";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { Breadcrumb, Breadcrumbs } from "react-aria-components";
import styles from "./index.module.scss";

type Item =
  | { label: string; href?: string; isLoading?: false }
  | { isLoading: true };

const BreadcrumbNav = ({
  items,
  action,
}: {
  items: Item[];
  action?: React.ReactNode;
}) => {
  const router = useRouter();
  const handleBackClick = useCallback(() => {
    const lastItem = items.at(-1);
    if (!lastItem?.isLoading) {
      const lastLink = lastItem?.href;
      if (lastLink) {
        router.push(lastLink);
      }
    }
  }, [items, router]);

  const itemsWithIds = useMemo(
    () =>
      items.map((item, index) => ({
        ...item,
        id: item.isLoading ? index : item.label,
      })),
    [items],
  );

  return (
    <div className={styles.breadcrumbNav}>
      <div className={styles.breadcrumbNavContainer}>
        {items.length > 1 && (
          <button
            className={styles.breadcrumbNavArrow}
            onClick={handleBackClick}
          >
            <ArrowLeftIcon />
          </button>
        )}
        <Breadcrumbs
          items={itemsWithIds}
          className={styles.breadcrumbNavList ?? ""}
        >
          {(item) => (
            <Breadcrumb>
              {({ isCurrent }) => (
                <>
                  <BreadcrumbNavItem item={item} />
                  {!isCurrent && (
                    <span className={styles.breadcrumbNavSeparator}>/</span>
                  )}
                </>
              )}
            </Breadcrumb>
          )}
        </Breadcrumbs>
        <div className={styles.breadcrumbNavAction}>{action}</div>
      </div>
    </div>
  );
};

const BreadcrumbNavItem = ({ item }: { item: Item }) => {
  if (item.isLoading) {
    return <Skeleton className={styles.breadcrumbNavItemSkeleton} />;
  }
  return item.href ? (
    <Link
      key={item.href}
      href={item.href}
      className={styles.breadcrumbNavItem ?? ""}
    >
      {item.label}
    </Link>
  ) : (
    <span key={item.label} className={styles.breadcrumbNavItem}>
      {item.label}
    </span>
  );
};

export default BreadcrumbNav;
