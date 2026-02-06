import { Variation } from "../../../../../components/Variation";

export default function DomainIdPage({
  params,
}: {
  params: Promise<{ appId: string; domainId: string }>;
}) {
  return (
      <VariationWithParams params={params} />
  );
}

async function VariationWithParams({
  params,
}: {
  params: Promise<{ appId: string; domainId: string }>;
}) {
  const { appId, domainId } = await params;
  return <Variation appId={appId} domainConfigId={domainId} />;
}
