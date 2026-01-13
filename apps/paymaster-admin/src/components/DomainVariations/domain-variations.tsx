import { Button } from "@fogo/component-library/Button";
import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { GridList, GridListItem } from "react-aria-components";
import type { DomainWithVariations } from "../../db-schema";
import BreadcrumbNav from "../BreadcrumbNav";
import { ListHeader } from "../ListHeader";
import styles from "./domain-variations.module.scss";
import { VariationCard } from "./variation-card";

type DomainVariationsProps =
  | {
      domain: DomainWithVariations;
      isLoading?: false;
    }
  | {
      isLoading: true;
    };

export const DomainVariations = (props: DomainVariationsProps) => {
  const router = useRouter();

  const handleClose = useCallback(() => {
    router.push("/");
  }, [router]);

  return (
    <>
      <BreadcrumbNav
        items={[
          { label: "Domains", href: "/" },
          props.isLoading ? { isLoading: true } : { label: props.domain.domain },
        ]}
        action={
          <Button onClick={handleClose} variant="outline">
            Close
          </Button>
        }
      />
      <div className={styles.container}>
        {props.isLoading ? (
          <ListHeader isLoading />
        ) : (
          <ListHeader
            title="Domains"
            count={props.domain.variations.length}
            action={<Button variant="secondary">Add Transaction Variation</Button>}
          />
        )}
        {props.isLoading ? (
          <VariationCard isLoading />
        ) : (
          <GridList
            selectionMode="none"
            aria-label="Domains"
            items={props.domain.variations}
          >
            {(item) => (
              <GridListItem key={item.id}>
                <VariationCard variation={item} />
              </GridListItem>
            )}
          </GridList>
        )}
      </div>
    </>
  );
};
