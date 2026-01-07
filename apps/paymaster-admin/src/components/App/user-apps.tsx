import { Badge } from "@fogo/component-library/Badge";
import { Button } from "@fogo/component-library/Button";
import { Card } from "@fogo/component-library/Card";
import { Skeleton } from "@fogo/component-library/Skeleton";
import { AppWindowIcon } from "@phosphor-icons/react/dist/ssr/AppWindow";
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
  if (props.isLoading) {
    return (
      <Card className={styles.appCard}>
        <div className={styles.appCardContent}>
          <h3 className={styles.appCardTitle}>Loading...</h3>
        </div>
      </Card>
    );
  }
  return (
    <Card className={styles.appCard}>
      <div className={styles.appCardContent}>
        <h3 className={styles.appCardTitle}>{props.app.name}</h3>
        <p className={styles.appCardDescription}>
          Created: {props.app.created_at.toLocaleDateString()}
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
          <Skeleton className={styles.appCard} />
          <Skeleton className={styles.appCard} />
          <Skeleton className={styles.appCard} />
          <Skeleton className={styles.appCard} />
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
        aria-label="Tokens"
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
