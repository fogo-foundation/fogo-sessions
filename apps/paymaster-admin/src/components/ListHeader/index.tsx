import { Badge } from "@fogo/component-library/Badge";
import { Skeleton } from "@fogo/component-library/Skeleton";
import styles from "./index.module.scss";

type ListHeaderProps =
  | {
      title: string;
      count?: number;
      action?: React.ReactNode;
      icon?: React.ReactNode;
      isLoading?: boolean | undefined;
    }
  | {
      isLoading: true;
    };

export const ListHeader = (props: ListHeaderProps) =>
  props.isLoading ? (
    <div className={styles.listHeader}>
      <Skeleton height={6} width={35}/>
      <Skeleton height={6} width={30}/>
    </div>
  ) : (
    <div className={styles.listHeader}>
      <h1 className={styles.listHeaderTitle}>
        {props.icon}
        {props.title} {props.count && <Badge size="xs">{props.count}</Badge>}
      </h1>
      {props.action}
    </div>
  );
