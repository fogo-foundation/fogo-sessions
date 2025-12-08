import { UserSchema } from "../db-schema";

export const fetchUserData = async (sessionToken: string) => {
  const response = await fetch(
    `/api/user-data?sessionToken=${encodeURIComponent(sessionToken)}`,
    { headers: { Authorization: `Bearer ${sessionToken}` } },
  );

  if (response.status === 404) {
    return;
  }

  if (!response.ok) {
    throw new Error("Failed to fetch user data");
  }

  return UserSchema.parse(await response.json());
};
