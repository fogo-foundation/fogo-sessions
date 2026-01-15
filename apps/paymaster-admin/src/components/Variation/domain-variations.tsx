import type { App, DomainConfig } from "../../db-schema";
import BreadcrumbNav from "../BreadcrumbNav";
import { DomainSettingsButton } from "../Domain/domain-settings-modal";
import { ListHeader } from "../ListHeader";
import styles from "./domain-variations.module.scss";
import VariationsList from "./variations-list";

type DomainVariationProps =
  | {
      app: App;
      domainConfig: DomainConfig;
      isLoading?: false;
    }
  | {
      isLoading: true;
    };

export const DomainVariation = (props: DomainVariationProps) => {
  return (
    <>
      <BreadcrumbNav
        items={[
          { label: "Apps", href: "/" },
          props.isLoading
            ? { isLoading: true }
            : { label: props.app.name, href: `/apps/${props.app.id}` },
          props.isLoading
            ? { isLoading: true }
            : { label: props.domainConfig.domain },
        ]}
        title={props.isLoading ? undefined : props.domainConfig.domain}
        titleLoading={props.isLoading}
        action={<DomainSettingsButton />}
      />
      <div className={styles.container}>
        <ListHeader
          title="Variation"
          isLoading={props.isLoading}
          {...(!props.isLoading && {
            count: props.domainConfig.variations.length,
          })}
        />
        {props.isLoading ? (
          <VariationsList isLoading />
        ) : (
          <VariationsList domainConfig={props.domainConfig} />
        )}
      </div>
    </>
  );
};
