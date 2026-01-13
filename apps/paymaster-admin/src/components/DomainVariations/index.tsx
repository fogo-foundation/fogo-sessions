"use client";

import { useParams } from "next/navigation";
import { useDomainData } from "../../client/domain";
import { PaymasterLoading } from "../loading";
import type { DomainWithVariations } from "../../db-schema";
import { DomainVariations } from "./domain-variations";


export const Domain = () => {
  const { id } = useParams<{ id: string }>();
  const { data, error, isLoading } = useDomainData(id);

  if (isLoading) return <PaymasterLoading />;
  if (error) return <div>Error loading domain: {error.message}</div>;
  if (!data) return <div>Domain not found</div>;

  return (
    <DomainContents domain={data} />
  );
};

type DomainContentsProps = 
  | {
      isLoading?: false;
      domain: DomainWithVariations;
    }
  | {
      isLoading: true;
    };

const DomainContents = (props: DomainContentsProps) => {
  if (props.isLoading) {
    return <PaymasterLoading />;
  }
  return <DomainVariationData domain={props.domain} />;
};

const DomainVariationData = ({
  domain,
}: {
  domain: DomainWithVariations;
}) => {
  return <DomainVariations domain={domain} />;
};
