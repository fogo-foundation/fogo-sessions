import Link from "next/link";

import { getUserPaymasterData } from "../../server/paymaster";

export const Domain = async ({
  params,
}: {
  params: Promise<{ appId: string; domainId: string }>;
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
      <div>
        <label>
          <input
            type="checkbox"
            checked={domainConfig.enable_session_management}
            readOnly
          />
          Enable Session Management
        </label>
      </div>

      <div>
        <label>
          <input
            type="checkbox"
            checked={domainConfig.enable_preflight_simulation}
            readOnly
          />
          Enable Preflight Simulation
        </label>
      </div>

      <h2>Variations:</h2>
      <ul>
        {domainConfig.variations.map((variation) => (
          <li key={variation.id}>
            <Link href={`/dashboard/${appId}/${domainId}/${variation.id}`}>
              {variation.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
