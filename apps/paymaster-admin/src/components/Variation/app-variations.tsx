import { Button } from "@fogo/component-library/Button";
import type { App, DomainConfig } from "../../db-schema";
import BreadcrumbNav from "../BreadcrumbNav";
import { Container } from "../Container";
import { DomainSettingsButton } from "../Domain/domain-settings-modal";
import { ListHeader } from "../ListHeader";

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
          { label: "Apps", href: "/" },
          props.isLoading ? { isLoading: true } : { label: props.app.name },
        ]}
        title={props.isLoading ? undefined : props.domainConfig.domain}
        titleLoading={props.isLoading}
        action={<DomainSettingsButton />}
      />
      <Container>
        {props.isLoading ? (
          <ListHeader isLoading />
        ) : (
          <ListHeader
            title="Variation"
            count={props.domainConfig.variations.length}
            action={<Button variant="secondary">Add Domain</Button>}
          />
        )}
      </Container>
    </>
  );
};
