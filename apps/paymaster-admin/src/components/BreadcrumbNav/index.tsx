import { Link } from "@fogo/component-library/Link";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import styles from "./index.module.scss";

const BreadcrumbNav = ({
  items,
  action,
}: {
  items: { label: string; href?: string }[];
  action?: React.ReactNode;
}) => {
  const router = useRouter();
  const handleBackClick = useCallback(() => {
    const lastLink = items.at(-2)?.href;
    if (lastLink) {
      router.push(lastLink);
    }
  }, [items, router]);

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
        {items.map((item, index) => (
          <>
            {item.href ? (
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
            )}
            {index < items.length - 1 && (
              <span className={styles.breadcrumbNavSeparator}>/</span>
            )}
          </>
        ))}
        <div className={styles.breadcrumbNavAction}>{action}</div>
      </div>
    </div>
  );
};

export default BreadcrumbNav;
