"use client";
import Link from "next/link";
import { useParams } from "next/navigation";

import { useUserData } from "../user-data-context";

export const App = () => {
  const { appId } = useParams<{ appId: string }>();
  const { userData, isLoading } = useUserData();

  if (isLoading) {
    return <div>Loading...</div>;
  }
  const app = userData?.apps.find((app) => app.id === appId);
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
            <Link href={`/${appId}/${domainConfig.id}`}>
              {domainConfig.domain}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
