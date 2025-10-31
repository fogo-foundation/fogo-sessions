import { getUserPaymasterData } from "../../server/paymaster";

export const Domain = async ({
  params,
  children,
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
      <h2>Variations:</h2>
      <ul>
        {domainConfig.variations.map((variation) => (
          <li key={variation.id}>{variation.transaction_variation.name}</li>
        ))}
      </ul>
      {children}
    </div>
  );
};
