import { Button } from "@fogo/component-library/Button";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { GridList, GridListItem } from "react-aria-components";
import type { App } from "../../db-schema";
import BreadcrumbNav from "../BreadcrumbNav";
import { ListHeader } from "../ListHeader";
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

  const handleClose = useCallback(() => {
    router.push("/");
  }, [router]);

  if (props.isLoading) {
    return (
      <div>
        <ListHeader isLoading />
      </div>
    );
  }

  return (
    <>
      <BreadcrumbNav
        items={[{ label: "Apps", href: "/" }, { label: props.app.name }]}
        action={
          <Button onClick={handleClose} variant="outline">
            Close
          </Button>
        }
      />
      <ListHeader
        title="Domains"
        count={props.app.domain_configs.length}
        action={<Button variant="secondary">Add Domain</Button>}
      />
      <GridList
        selectionMode="none"
        aria-label="Domains"
        items={props.app.domain_configs}
      >
        {(item) => (
          <GridListItem key={item.id}>
            <DomainCard domain={item} />
          </GridListItem>
        )}
      </GridList>
    </>
  );
};
