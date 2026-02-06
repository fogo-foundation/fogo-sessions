import { Suspense } from "react";

import { Domain } from "../../../components/Domain";
import { PaymasterLoading } from "../../../components/loading";

export default function AppIdPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  return (
    <Suspense fallback={<PaymasterLoading />}>
      <DomainWithParams params={params} />
    </Suspense>
  );
}

async function DomainWithParams({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  const { appId } = await params;
  return <Domain appId={appId} />;
}
