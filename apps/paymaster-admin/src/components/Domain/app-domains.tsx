import { Button } from "@fogo/component-library/Button";
import { useToast } from "@fogo/component-library/Toast";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { GridList, GridListItem } from "react-aria-components";
import type { App } from "../../db-schema";
import BreadcrumbNav from "../BreadcrumbNav";
import { ListHeader } from "../ListHeader";
import styles from "./app-domains.module.scss";
import { DomainCard } from "./domain-card";

type AppDomainsProps =
  | {
      app: App;
      isLoading?: false;
    }
  | {
      isLoading: true;
    };

export const AppDomains = (props: AppDomainsProps) => {
  const router = useRouter();
  const toast = useToast();

  const handleClose = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleAddDomain = useCallback(() => {
    toast.error("Coming Soon");
  }, [toast]);

  return (
    <>
      <BreadcrumbNav
        items={[
          { label: "Apps", href: "/" },
          props.isLoading ? { isLoading: true } : { label: props.app.name },
        ]}
        action={
          <Button onClick={handleClose} variant="outline">
            Close
          </Button>
        }
      />
      <div className={styles.container}>
        <ListHeader
          title="Domains"
          isLoading={props.isLoading}
          action={
            <Button variant="secondary" onClick={handleAddDomain}>
              Add Domain
            </Button>
          }
          {...(!props.isLoading && {
            count: props.app.domain_configs.length,
          })}
        />
        {props.isLoading ? (
          <DomainCard isLoading />
        ) : (
          <GridList
            selectionMode="none"
            aria-label="Domains"
            items={props.app.domain_configs}
            className={styles.domainsList ?? ''}
          >
            {(item) => (
              <GridListItem key={item.id}>
                <DomainCard appId={props.app.id} domain={item} />
              </GridListItem>
            )}
          </GridList>
        )}
      </div>
    </>
  );
};
