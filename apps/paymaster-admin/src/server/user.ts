import { verifyLogInToken } from "@fogo/sessions-sdk";
import { cookies } from "next/headers";

import { connection } from "../fogo-connection";

export const getAuthenticatedUserAddress = async () => {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("sessionToken")?.value;
  if (!sessionToken) {
    return;
  }
  try {
    const acc = await verifyLogInToken(sessionToken, connection);
    return acc?.user.toString();
  } catch {
    return;
  }
};
