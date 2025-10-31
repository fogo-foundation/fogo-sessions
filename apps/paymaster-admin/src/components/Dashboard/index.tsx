import { cookies } from "next/headers";
import Link from "next/link";

import { fetchPaymasterDataFromToken } from "../../server/paymaster";

const getUserPaymasterData = async () => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("sessionToken");
  const data = await fetchPaymasterDataFromToken({
    token: sessionToken?.value ?? "",
  });
  return data;
};

export const Dashboard = async ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const data = await getUserPaymasterData();
  return (
    <div>
      <h1>Dashboard</h1>
      <h2>Apps</h2>
      <ul>
        {data.apps.map((app) => (
          <li key={app.id}>
            <Link href={`/dashboard/${app.id}`}>{app.name}</Link>
          </li>
        ))}
      </ul>
      {children}
    </div>
  );
};
