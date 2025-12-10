import { UserSchema } from "../db-schema";

export const fetchUserData = async (sessionToken: string) => {
  const response = await fetch(
    `/api/user-data?sessionToken=${encodeURIComponent(sessionToken)}`,
    { headers: { Authorization: `Bearer ${sessionToken}` } },
  );

  if (response.status === 404) {
    throw new UserNotFoundError();
  }

  if (!response.ok) {
    throw new Error("Failed to fetch user data");
  }

  return UserSchema.parse(await response.json());
};

export class UserNotFoundError extends Error {
  constructor() {
    super("User not found");
    this.name = "UserNotFoundError";
  }
}
