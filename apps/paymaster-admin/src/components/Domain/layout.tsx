"use client";
import { useParams } from "next/navigation";

import { useUserData } from "../user-data-context";

export const DomainLayout = ({ children }: { children: React.ReactNode }) => {
  const { appId, domainId } = useParams<{ appId: string; domainId: string }>();
  const { userData, isLoading } = useUserData();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!userData) {
    return;
  }

  const domainConfig = userData.apps
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
