import { verifyLogInToken } from "@fogo/sessions-sdk";
import {
  unstable_cacheTag as cacheTag,
  unstable_cacheLife as cacheLife,
} from "next/cache";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { connection } from "../../../fogo-connection";
import { fetchUserPaymasterData } from "../../../server/paymaster";

const fetchData = async (walletAddress: string) => {
  "use cache";
  cacheTag("user-data");
  cacheLife("seconds");
  return fetchUserPaymasterData(walletAddress);
};

export const GET = async (request: NextRequest) => {
  const auth = request.headers.get("authorization");
  const sessionToken = auth?.startsWith("Bearer ") ? auth.slice(7) : undefined;

  if (!sessionToken)
    return NextResponse.json({ error: "Missing token" }, { status: 401 });

  const acc = await verifyLogInToken(sessionToken, connection);
  if (!acc) {
    return NextResponse.json(
      { error: "Invalid session token" },
      { status: 401 },
    );
  }
  const userData = await fetchData(acc.user.toString());
  if (!userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(userData);
};
