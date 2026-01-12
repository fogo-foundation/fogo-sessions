import { Badge } from "@fogo/component-library/Badge";
import { Skeleton } from "@fogo/component-library/Skeleton";
import { TextField } from "@fogo/component-library/TextField";
import type { Variation } from "../../db-schema";
import { DeleteVariationButton } from "./delete-variation-button";
import styles from "./variations-list-item.module.scss";

type VariationListItemProps =
  | {
      variation: Variation;
      isLoading?: false;
    }
  | {
      isLoading: true;
    };

export const VariationListItem = (props: VariationListItemProps) => {
  return props.isLoading ? (
    <Skeleton className={styles.variationListItemSkeleton} />
  ) : (
    <div className={styles.variationListItem}>
      <div className={styles.variationListCard}>
        <VariationVersionBadge version={props.variation.version} />
        <TextField
          value={props.variation.name}
          className={styles.fieldVariationName ?? ""}
        />
        <TextField value={props.variation.max_gas_spend.toString()} />
      </div>
      <DeleteVariationButton />
    </div>
  );
};

const VariationVersionBadge = ({
  version,
}: {
  version: Variation["version"];
}) => {
  return (
    <Badge variant="info" size="xs">
      {version === "v0" ? "V0" : "V1"}
    </Badge>
  );
};
