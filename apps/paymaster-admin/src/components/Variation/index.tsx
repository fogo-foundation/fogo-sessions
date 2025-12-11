"use client";
import { useParams } from "next/navigation";
import { Suspense } from "react";

import { useUserData } from "../user-data-context";

const VariationContent = () => {
  const { appId, domainId, variationId } = useParams<{
    appId: string;
    domainId: string;
    variationId: string;
  }>();
  const { userData, isLoading } = useUserData();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!userData) {
    return;
  }

  const variation = userData.apps
    .find((app) => app.id === appId)
    ?.domain_configs.find((domainConfig) => domainConfig.id === domainId)
    ?.variations.find((variation) => variation.id === variationId);

  if (!variation) {
    return (
      <div>
        <h1>Variation not found</h1>
        <p>Variation ID: {variationId}</p>
      </div>
    );
  }
  return (
    <div>
      <h1>Variation: {variation.name}</h1>
      <h2>Max Gas Spend: {variation.max_gas_spend}</h2>
      <h2>Constraints:</h2>
      <ul>
        {variation.version === "v0" ? (
          <li>No constraints for v0</li>
        ) : (
          <>
            {variation.transaction_variation.map((instruction) => (
              <li key={instruction.program}>
                {JSON.stringify(instruction, undefined, 2)}
              </li>
            ))}
          </>
        )}
      </ul>
    </div>
  );
};

export const Variation = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VariationContent />
    </Suspense>
  );
};
