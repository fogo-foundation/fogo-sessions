import { Suspense } from "react";
import { PaymasterLoading } from "../../../../../components/loading";
import { Variation } from "../../../../../components/Variation";

export default function DomainIdPage({
  params,
}: {
  params: Promise<{ appId: string; domainId: string }>;
}) {
  return (
    <Suspense fallback={<PaymasterLoading />}>
      <VariationWithParams params={params} />
    </Suspense>
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
