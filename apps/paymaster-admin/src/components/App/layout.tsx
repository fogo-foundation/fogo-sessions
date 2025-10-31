import { getUserPaymasterData } from "../../server/paymaster";

export const AppLayout = async ({
  children,
  params,
}: {
  params: Promise<{ appId: string }>;
  children: React.ReactNode;
}) => {
  const { appId } = await params;
  const data = await getUserPaymasterData();
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
      <h1>App: {app.name}</h1>
      {children}
    </div>
  );
};
