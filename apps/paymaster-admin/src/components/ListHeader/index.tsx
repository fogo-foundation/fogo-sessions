import { Badge } from "@fogo/component-library/Badge";
import { Skeleton } from "@fogo/component-library/Skeleton";
import styles from "./index.module.scss";

type ListHeaderProps =
  | {
      title: string;
      count?: number;
      action?: React.ReactNode;
      isLoading?: false;
    }
  | {
      isLoading: true;
    };

export const ListHeader = (props: ListHeaderProps) => 
  props.isLoading ? (
    <div className={styles.listHeader}>
      <Skeleton className={styles.listHeaderTitleSkeleton} />
      <Skeleton className={styles.listHeaderActionSkeleton} />
    </div>
  ) : (
    <div className={styles.listHeader}>
      <h1 className={styles.listHeaderTitle}>
        {props.title} {props.count && <Badge size="xs">{props.count}</Badge>}
      </h1>
      {props.action}
    </div>
  );
