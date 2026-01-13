import { Badge } from "@fogo/component-library/Badge";
import { Button } from "@fogo/component-library/Button";
import { Skeleton } from "@fogo/component-library/Skeleton";
import { TextField } from "@fogo/component-library/TextField";
import { CodeBlockIcon } from "@phosphor-icons/react/dist/ssr";
import { GasPumpIcon } from "@phosphor-icons/react/dist/ssr/GasPump";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useState } from "react";
import type { Variation } from "../../db-schema";
import { DeleteVariationButton } from "./delete-variation-button";
import { VariationCodeBlock } from "./variation-code-block";
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
  const [isExpanded, setIsExpanded] = useState(false);

  const handleExpand = useCallback(() => {
    setIsExpanded((value) => !value);
  }, []);

  return props.isLoading ? (
    <Skeleton className={styles.variationListItemSkeleton} />
  ) : (
    <div>
      <div className={styles.variationListItem}>
        <div
          className={styles.variationListCard}
          data-is-expanded={isExpanded ? "" : undefined}
        >
          <VariationVersionBadge version={props.variation.version} />
          <TextField
            value={props.variation.name}
            className={styles.fieldVariationName ?? ""}
          />
          <TextField
            value={props.variation.max_gas_spend.toString()}
            rightExtra={<GasPumpIcon />}
          />
          <Button variant="outline" onClick={handleExpand}>
            <CodeBlockIcon />
          </Button>
        </div>
        <DeleteVariationButton />
      </div>
      <VariationCodeBlock isExpanded={isExpanded} variation={props.variation} />
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
