import Link from "next/link";

import { getUserPaymasterData } from "../../server/paymaster";
import { UserNotFound } from "../UserNotFound";

export const App = async ({
  params,
}: {
  params: Promise<{ appId: string }>;
}) => {
  const { appId } = await params;
  const data = await getUserPaymasterData();

  if (!data) {
    return <UserNotFound />;
  }

  const app = data.apps.find((app) => app.id === appId);
  if (!app) {
    return (
      <div>
        <h1>App not found</h1>
        <p>App ID: {appId}</p>
      </div>
    );
  }
  return (
    <div>
      <h2>Domain Configs</h2>
      <ul>
        {app.domain_configs.map((domainConfig) => (
          <li key={domainConfig.id}>
            <Link href={`/dashboard/${appId}/${domainConfig.id}`}>
              {domainConfig.domain}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
