import { verifyLogInToken } from "@fogo/sessions-sdk";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { connection } from "../../../fogo-connection";
import { fetchUserPaymasterData } from "../../../server/paymaster";

export const GET = async (request: NextRequest) => {
  const sessionToken = request.nextUrl.searchParams.get("sessionToken");
  if (!sessionToken) {
    return NextResponse.json({ error: "No session token" }, { status: 401 });
  }
  const acc = await verifyLogInToken(sessionToken, connection);
  if (!acc) {
    return NextResponse.json(
      { error: "Invalid session token" },
      { status: 401 },
    );
  }
  const userData = await fetchUserPaymasterData(acc.user.toString());
  if (!userData) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  return NextResponse.json(userData);
};
