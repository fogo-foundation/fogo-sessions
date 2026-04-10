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
        action={
          <Button onClick={handleClose} variant="outline">
            Close
          </Button>
        }
        items={[
          { href: "/", label: "Apps" },
          props.isLoading ? { isLoading: true } : { label: props.app.name },
        ]}
      />
      <div className={styles.container}>
        <ListHeader
          action={
            <Button onClick={handleAddDomain} variant="secondary">
              Add Domain
            </Button>
          }
          isLoading={props.isLoading}
          title="Domains"
          {...(!props.isLoading && {
            count: props.app.domain_configs.length,
          })}
        />
        {props.isLoading ? (
          <DomainCard isLoading />
        ) : (
          <GridList
            aria-label="Domains"
            className={styles.domainsList ?? ""}
            items={props.app.domain_configs}
            selectionMode="none"
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
