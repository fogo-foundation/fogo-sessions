import { StackIcon } from "@phosphor-icons/react/dist/ssr";
import type { App, DomainConfig } from "../../db-schema";
import BreadcrumbNav from "../BreadcrumbNav";
import { DomainSettings } from "../DomainSettings";
import { ListHeader } from "../ListHeader";
import { AddVariationButton } from "./add-variation-button";
import styles from "./app-variations.module.scss";
import VariationsList from "./variations-list";

type AppVariationProps =
  | {
      app: App;
      domainConfig: DomainConfig;
      isLoading?: false;
    }
  | {
      isLoading: true;
    };

export const AppVariation = (props: AppVariationProps) => {
  return (
    <>
      <BreadcrumbNav
        items={[
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
          <DomainSettings
            domainConfig={props.domainConfig}
          />
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
              action: <AddVariationButton />,
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
