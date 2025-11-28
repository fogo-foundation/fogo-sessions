import Link from "next/link";

import { getUserPaymasterData } from "../../server/paymaster";
import { UserNotFound } from "../UserNotFound";

export const Dashboard = async () => {
  const data = await getUserPaymasterData();

  if (!data) {
    return <UserNotFound />;
  }

  return (
    <div>
      <h2>Apps</h2>
      <ul>
        {data.apps.map((app) => (
          <li key={app.id}>
            <Link href={`/dashboard/${app.id}`}>{app.name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
