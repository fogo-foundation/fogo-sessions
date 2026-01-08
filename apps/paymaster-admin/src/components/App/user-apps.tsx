import { Badge } from "@fogo/component-library/Badge";
import { Button } from "@fogo/component-library/Button";
import { Card } from "@fogo/component-library/Card";
import { Skeleton } from "@fogo/component-library/Skeleton";
import { AppWindowIcon } from "@phosphor-icons/react/dist/ssr/AppWindow";
import { useDateFormatter } from "react-aria";
import { GridList, GridListItem } from "react-aria-components";
import type { App, User } from "../../db-schema";

import styles from "./user-apps.module.scss";

type AppCardProps =
  | {
      app: App;
      isLoading?: false;
    }
  | {
      isLoading: true;
    };

const AppCard = (props: AppCardProps) => {
  const formatter = useDateFormatter();

  if (props.isLoading) {
    return <Skeleton className={styles.appCard} />;
  }
  return (
    <Card className={styles.appCard}>
      <div className={styles.appCardContent}>
        <h3 className={styles.appCardTitle}>{props.app.name}</h3>
        <p className={styles.appCardDescription}>
          Created: {formatter.format(props.app.created_at)}
        </p>
      </div>
      <div>
        <Button variant="outline" href={`/apps/${props.app.id}`}>
          View
        </Button>
      </div>
    </Card>
  );
};

type UserAppsProps =
  | {
      user: User;
      isLoading?: false;
    }
  | {
      isLoading: true;
    };

export const UserApps = (props: UserAppsProps) => {
  if (props.isLoading) {
    return (
      <>
        <div className={styles.userAppsHeader}>
          <h1 className={styles.userAppsTitle}>
            <Skeleton className={styles.userAppsTitleSkeleton} />
          </h1>
          <Skeleton className={styles.addAppButtonSkeleton} />
        </div>
        <div className={styles.userApps}>
          <AppCard isLoading />
          <AppCard isLoading />
          <AppCard isLoading />
          <AppCard isLoading />
        </div>
      </>
    );
  }
  return (
    <>
      <div className={styles.userAppsHeader}>
        <h1 className={styles.userAppsTitle}>
          Apps <Badge size="xs">{props.user.apps.length}</Badge>
        </h1>
        <Button variant="secondary">
          Request App <AppWindowIcon />
        </Button>
      </div>
      <GridList
        className={styles.userApps ?? ""}
        selectionMode="none"
        aria-label="Apps"
        items={props.user.apps}
      >
        {(item) => (
          <GridListItem key={item.id}>
            <AppCard app={item} />
          </GridListItem>
        )}
      </GridList>
    </>
  );
};

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};
