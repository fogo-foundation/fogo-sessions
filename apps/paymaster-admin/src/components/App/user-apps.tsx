import { Badge } from "@fogo/component-library/Badge";
import { Button } from "@fogo/component-library/Button";
import { Card } from "@fogo/component-library/Card";
import { Skeleton } from "@fogo/component-library/Skeleton";
import { AppWindowIcon } from "@phosphor-icons/react/dist/ssr/AppWindow";
import { GridList, GridListItem } from "react-aria-components";
import type { App, User } from "../../db-schema";
import { ListHeader } from "../ListHeader";
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
    return <Skeleton className={styles.appCard} />;
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
        <ListHeader isLoading />
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
      <ListHeader
        title="Apps"
        count={props.user.apps.length}
        action={
          <Button variant="secondary">
            Request App <AppWindowIcon />
          </Button>
        }
      />
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
