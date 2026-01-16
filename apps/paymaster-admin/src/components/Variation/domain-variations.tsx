import { StackIcon } from "@phosphor-icons/react/dist/ssr";
import type { App, DomainConfig } from "../../db-schema";
import BreadcrumbNav from "../BreadcrumbNav";
import { DomainSettings } from "../DomainSettings";
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
      />
      <div className={styles.container}>
        {props.isLoading ? (
          <DomainSettings isLoading />
        ) : (
          <DomainSettings domainConfig={props.domainConfig} />
        )}
        {props.isLoading ? (
          <ListHeader isLoading />
        ) : (
          <ListHeader
            title="Variations"
            icon={<StackIcon size={24} weight="duotone" />}
            isLoading={props.isLoading}
            {...(!props.isLoading && {
              count: props.domainConfig.variations.length,
            })}
          />
        )}
        {props.isLoading ? (
          <VariationsList isLoading />
        ) : (
          <VariationsList domainConfig={props.domainConfig} />
        )}
      </div>
    </>
  );
};
