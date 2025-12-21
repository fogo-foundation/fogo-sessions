import Link from "next/link";

import type { User } from "../../db-schema";

export const UserApps = ({ user }: { user: User }) => {
  return (
    <div>
      User Apps
      <ul>
        {user.apps.map(({ id, name }) => (
          <li key={id}>
            <Link href={`/apps/${id}`}>{name}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
};
