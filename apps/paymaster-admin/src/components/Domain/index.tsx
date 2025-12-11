"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Suspense } from "react";

import { useUserData } from "../user-data-context";

const DomainContent = () => {
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
            <Link href={`/${appId}/${domainId}/${variation.id}`}>
              {variation.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export const Domain = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DomainContent />
    </Suspense>
  );
};
