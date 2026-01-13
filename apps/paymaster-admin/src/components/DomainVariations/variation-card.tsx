import { Badge, type BadgeProps } from "@fogo/component-library/Badge";
import { Button } from "@fogo/component-library/Button";
import { Card } from "@fogo/component-library/Card";
import { Skeleton } from "@fogo/component-library/Skeleton";
import z from "zod";
import {
  type VariationSchema,
  type VariationVersionSchema,
} from "../../db-schema";
import styles from "./variation-card.module.scss";

type VariationCardProps =
  | {
      variation: z.infer<typeof VariationSchema>;
      isLoading?: false;
    }
  | {
      isLoading: true;
    };

const networkBadgeVariation: Record<
  z.infer<typeof VariationVersionSchema>,
  BadgeProps["variant"]
> = {
  v0: "success",
  v1: "error",
};

export const VariationCard = (props: VariationCardProps) =>
  props.isLoading ? (
    <Skeleton className={styles.variationCardSkeleton} />
  ) : (
    <Card className={styles.variationCard}>
      <div className={styles.variationCardHeader}>
        <h3 className={styles.variationCardTitle}>{props.variation.name}</h3>
        <Badge
          variant={networkBadgeVariation[props.variation.version]}
          size="md"
          style="filled"
        >
          {props.variation.version}
        </Badge>
      </div>
      <Button variant="outline" href={`/domains/${props.variation.id}`}>
        Edit
      </Button>
    </Card>
  );
