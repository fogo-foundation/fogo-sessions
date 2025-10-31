import { cookies } from "next/headers";

import { fetchPaymasterDataFromToken } from "../../server/paymaster";

export const App = async ({
  params,
}: {
  params: Promise<{ appId: string }>;
}) => {
  const { appId } = await params;
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("sessionToken");
  const data = await fetchPaymasterDataFromToken({
    token: sessionToken?.value ?? "",
  });
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
      <h1>App</h1>
      <h2>{app.name}</h2>
      <pre>{JSON.stringify(app, undefined, 2)}</pre>
    </div>
  );
};
