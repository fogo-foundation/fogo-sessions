import { getUserPaymasterData } from "../../server/paymaster";

export const DomainLayout = async ({
  children,
  params,
}: {
  params: Promise<{ appId: string; domainId: string }>;
  children: React.ReactNode;
}) => {
  const { appId, domainId } = await params;
  const data = await getUserPaymasterData();
  const domainConfig = data.apps
    .find((app) => app.id === appId)
    ?.domain_configs.find((domainConfig) => domainConfig.id === domainId);
  if (!domainConfig) {
    return (
      <div>
        <h1>Domain not found</h1>
        <p>Domain ID: {domainId}</p>
      </div>
    );
  }
  return (
    <div>
      <h1>Domain: {domainConfig.domain}</h1>
      {children}
    </div>
  );
};
