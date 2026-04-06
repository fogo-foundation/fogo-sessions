import type { EstablishedSessionState } from "@fogo/sessions-sdk-react";
import { GridList, GridListItem } from "react-aria-components";
import type { DomainConfig } from "../../db-schema";
import styles from "./variations-list.module.scss";
import { VariationListItem } from "./variations-list-item";

type VariationsListProps =
  | {
      domainConfig: DomainConfig;
      sessionState: EstablishedSessionState;
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
    <>
      <GridList
        aria-label="Variations"
        className={styles.variationsList ?? ""}
        items={props.domainConfig.variations}
        layout="grid"
      >
        {(variation) => (
          <GridListItem key={variation.id}>
            <VariationListItem
              domainConfigId={props.domainConfig.id}
              domainName={props.domainConfig.domain}
              networkEnvironment={props.domainConfig.network_environment}
              sessionState={props.sessionState}
              variation={variation}
            />
          </GridListItem>
        )}
      </GridList>
      <VariationListItem
        domainConfigId={props.domainConfig.id}
        domainName={props.domainConfig.domain}
        networkEnvironment={props.domainConfig.network_environment}
        sessionState={props.sessionState}
      />
    </>
  );
};

export default VariationsList;
