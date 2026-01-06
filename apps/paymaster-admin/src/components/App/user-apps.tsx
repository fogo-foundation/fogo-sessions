import { Badge } from "@fogo/component-library/Badge";
import { Button } from "@fogo/component-library/Button";
import { Card } from "@fogo/component-library/Card";
import { AppWindowIcon } from "@phosphor-icons/react/dist/ssr/AppWindow";
import { GridList, GridListItem } from "react-aria-components";
import type { App, User } from "../../db-schema";
import styles from "./user-apps.module.scss";

const AppCard = ({ app }: { app: App }) => {
  return (
    <Card className={styles.appCard}>
      <div className={styles.appCardContent}>
        <h3 className={styles.appCardTitle}>{app.name}</h3>
        <p className={styles.appCardDescription}>
          Created: {app.created_at.toLocaleDateString()}
        </p>
      </div>
      <div>
        <Button variant="outline" href={`/apps/${app.id}`}>
          View
        </Button>
      </div>
    </Card>
  );
};

export const UserApps = ({ user }: { user: User }) => {
  return (
    <>
      <div className={styles.userAppsHeader}>
        <h1 className={styles.userAppsTitle}>
          Apps <Badge size="xs">{user.apps.length}</Badge>
        </h1>
        <Button variant="secondary">
          Request App <AppWindowIcon />
        </Button>
      </div>
      <GridList
        className={styles.userApps ?? ""}
        selectionMode="none"
        aria-label="Tokens"
        items={user.apps}
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
