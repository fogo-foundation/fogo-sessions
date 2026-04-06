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

type BreadcrumbNavProps = TitleProps & {
  items: Item[];
  action?: React.ReactNode;
};

const BreadcrumbNav = ({
  items,
  action,
  title,
  titleLoading,
}: BreadcrumbNavProps) => {
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
    <Skeleton height={6} width={80} />
  ) : (
    <span className={styles.breadcrumbNavTitle}>{title}</span>
  );
};

export const BreadcrumbBackArrow = ({ items }: { items: Item[] }) => {
  const router = useRouter();
  const itemWithHref = items.at(-2);

  const hasBackLink =
    itemWithHref && !itemWithHref.isLoading && itemWithHref.href;

  const handleBackClick = useCallback(() => {
    if (hasBackLink && itemWithHref?.href) {
      router.push(itemWithHref.href);
    }
  }, [hasBackLink, itemWithHref, router]);

  return (
    hasBackLink && (
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
                <span
                  className={styles.breadcrumbNavSeparator}
                  data-small={isSmall}
                >
                  /
                </span>
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
    return <Skeleton height={6} width={80} />;
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
