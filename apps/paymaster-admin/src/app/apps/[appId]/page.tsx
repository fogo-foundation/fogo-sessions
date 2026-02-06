
import { Domain } from "../../../components/Domain";

export default function AppIdPage({
  params,
}: {
  params: Promise<{ appId: string }>;
}) {
  return (
    <DomainWithParams params={params} />
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
