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

type TitleProps = {
  title?: string | undefined;
  titleLoading?: boolean | undefined;
};

type BreadcrumbNav = TitleProps & {
  items: Item[];
  action?: React.ReactNode;
};

const BreadcrumbNav = ({
  items,
  action,
  title,
  titleLoading,
}: BreadcrumbNav) => {
  return (
    <div className={styles.breadcrumbNav}>
      <div className={styles.breadcrumbNavContainer}>
        {title || titleLoading ? (
          <div>
            <BreadcrumbNavItems items={items} isSmall />
            <div className={styles.breadcrumbNavTitleContainer}>
              <BreadcrumbNavTitle title={title} titleLoading={titleLoading} />
              <BreadcrumbBackArrow items={items} />
            </div>
          </div>
        ) : (
          <>
            <BreadcrumbNavItems items={items} />
            <BreadcrumbBackArrow items={items} />
          </>
        )}
        <div className={styles.breadcrumbNavAction}>{action}</div>
      </div>
    </div>
  );
};

const BreadcrumbNavTitle = ({ title, titleLoading }: TitleProps) => {
  return titleLoading ? (
    <Skeleton className={styles.breadcrumbNavTitleSkeleton} />
  ) : (
    <span className={styles.breadcrumbNavTitle}>{title}</span>
  );
};

export const BreadcrumbBackArrow = ({ items }: { items: Item[] }) => {
  const router = useRouter();
  const handleBackClick = useCallback(() => {
    const lastItemWithHref = items.findLast(
      (item) => !item.isLoading && item.href,
    );
    if (
      lastItemWithHref &&
      !lastItemWithHref.isLoading &&
      lastItemWithHref.href
    ) {
      router.push(lastItemWithHref.href);
    }
  }, [items, router]);

  return (
    items.length > 1 && (
      <button className={styles.breadcrumbNavArrow} onClick={handleBackClick}>
        <ArrowLeftIcon />
      </button>
    )
  );
};

export const BreadcrumbNavItems = ({
  items,
  isSmall,
}: {
  items: Item[];
  isSmall?: boolean | undefined;
}) => {
  const itemsWithIds = useMemo(
    () =>
      items.map((item, index) => ({
        ...item,
        id: item.isLoading ? index : item.label,
      })),
    [items],
  );

  return (
    <Breadcrumbs
      items={itemsWithIds}
      className={styles.breadcrumbNavList ?? ""}
    >
      {(item) => (
        <Breadcrumb>
          {({ isCurrent }) => (
            <>
              <BreadcrumbNavItem item={item} isSmall={isSmall} />
              {!isCurrent && (
                <span className={styles.breadcrumbNavSeparator}>/</span>
              )}
            </>
          )}
        </Breadcrumb>
      )}
    </Breadcrumbs>
  );
};

const BreadcrumbNavItem = ({
  item,
  isSmall,
}: {
  item: Item;
  isSmall?: boolean | undefined;
}) => {
  if (item.isLoading) {
    return <Skeleton className={styles.breadcrumbNavItemSkeleton} />;
  }
  return item.href ? (
    <Link
      key={item.href}
      href={item.href}
      className={styles.breadcrumbNavItem ?? ""}
      data-small={isSmall}
    >
      {item.label}
    </Link>
  ) : (
    <span
      key={item.label}
      className={styles.breadcrumbNavItem}
      data-small={isSmall}
    >
      {item.label}
    </span>
  );
};

export default BreadcrumbNav;
