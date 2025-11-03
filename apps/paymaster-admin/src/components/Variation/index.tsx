import { getUserPaymasterData } from "../../server/paymaster";

export const Variation = async ({
  params,
}: {
  params: Promise<{ appId: string; domainId: string; variationId: string }>;
}) => {
  const { appId, domainId, variationId } = await params;
  const data = await getUserPaymasterData();
  const variation = data.apps
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
      <h1>Variation: {variation.transaction_variation.name}</h1>
      <h2>Constraints:</h2>
      <ul>
        {variation.transaction_variation.version === "v0" ? (
          <li>No constraints for v0</li>
        ) : (
          variation.transaction_variation.instructions.map((instruction) => (
            <li key={instruction.program}>
              {JSON.stringify(instruction, undefined, 2)}
            </li>
          ))
        )}
      </ul>
    </div>
  );
};
