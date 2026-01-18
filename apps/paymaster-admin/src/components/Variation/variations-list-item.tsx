import { Badge } from "@fogo/component-library/Badge";
import { Button } from "@fogo/component-library/Button";
import { Skeleton } from "@fogo/component-library/Skeleton";
import { TextField } from "@fogo/component-library/TextField";
import { CodeBlockIcon } from "@phosphor-icons/react/dist/ssr";
import { GasPumpIcon } from "@phosphor-icons/react/dist/ssr/GasPump";
import { useCallback, useState } from "react";
import { Form } from "react-aria-components";
import type { Variation } from "../../db-schema";
import { DeleteVariationButton } from "./delete-variation-button";
import { VariationCodeBlock } from "./variation-code-block";
import styles from "./variations-list-item.module.scss";

type VariationListItemProps =
  | {
      domain: string;
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
    <VariationForm domain={props.domain} variation={props.variation} />
  );
};

const VariationForm = ({ domain, variation }: { domain: string; variation: Variation }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [name, setName] = useState(variation.name);
  const [code, setCode] = useState("");
  const [maxGasSpend, setMaxGasSpend] = useState(
    variation.max_gas_spend.toString(),
  );

  const handleExpand = useCallback(() => {
    setIsExpanded((value) => !value);
  }, []);

  return (
    <Form>
      <div className={styles.variationListItem}>
        <div
          className={styles.variationListCard}
          data-is-expanded={isExpanded ? "" : undefined}
        >
          <VariationVersionBadge version={variation.version} />
          <TextField
            value={name}
            className={styles.fieldVariationName ?? ""}
            onChange={setName}
          />
          <TextField
            value={maxGasSpend}
            onChange={setMaxGasSpend}
            rightExtra={<GasPumpIcon />}
            className={styles.fieldMaxGasSpend ?? ""}
          />
          <Button variant="outline" onClick={handleExpand}>
            <CodeBlockIcon />
          </Button>
        </div>
        <DeleteVariationButton />
      </div>
      <VariationCodeBlock
        isExpanded={isExpanded}
        domain={domain}
        variation={variation}
        value={code}
        onChange={setCode}
      />
    </Form>
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
