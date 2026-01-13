import { GridList, GridListItem } from "react-aria-components";
import type { DomainConfig } from "../../db-schema";
import styles from "./variations-list.module.scss";
import { VariationListItem } from "./variations-list-item";

type VariationsListProps =
  | {
      domainConfig: DomainConfig;
      isLoading?: false | undefined;
    }
  | {
      isLoading: true;
    };

const VariationsList = (props: VariationsListProps) => {
  return props.isLoading ? (
    <div className={styles.variationsList}>
      <VariationListItem isLoading />
      <VariationListItem isLoading />
      <VariationListItem isLoading />
    </div>
  ) : (
    <GridList
      className={styles.variationsList ?? ""}
      aria-label="Variations"
      layout="grid"
      items={props.domainConfig.variations}
    >
      {(variation) => (
        <GridListItem key={variation.id}>
          <VariationListItem variation={variation} />
        </GridListItem>
      )}
    </GridList>
  );
};

export default VariationsList;
