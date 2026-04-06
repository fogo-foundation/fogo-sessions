import type { BadgeProps } from "@fogo/component-library/Badge";
import { Badge } from "@fogo/component-library/Badge";
import { Button } from "@fogo/component-library/Button";
import { Card } from "@fogo/component-library/Card";
import { Skeleton } from "@fogo/component-library/Skeleton";
import type z from "zod";
import type {
  App,
  DomainConfig,
  NetworkEnvironmentSchema,
} from "../../db-schema";
import styles from "./domain-card.module.scss";

type DomainCardProps =
  | {
      appId: App["id"];
      domain: DomainConfig;
      isLoading?: false;
    }
  | {
      isLoading: true;
    };

const networkBadgeVariation: Record<
  z.infer<typeof NetworkEnvironmentSchema>,
  BadgeProps["variant"]
> = {
  mainnet: "success",
  testnet: "neutral",
  localnet: "neutral",
};

export const DomainCard = (props: DomainCardProps) =>
  props.isLoading ? (
    <Skeleton height={16.5} />
  ) : (
    <Card className={styles.domainCard}>
      <div className={styles.domainCardHeader}>
        <h3 className={styles.domainCardTitle}>{props.domain.domain}</h3>
        <Badge
          variant={networkBadgeVariation[props.domain.network_environment]}
          size="md"
          style="filled"
        >
          {props.domain.network_environment}
        </Badge>
      </div>
      <Button
        variant="outline"
        href={`/apps/${props.appId}/domains/${props.domain.id}`}
      >
        Edit
      </Button>
    </Card>
  );
